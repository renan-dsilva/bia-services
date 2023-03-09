'use_strict';

let Enum = require('../../enums');
let ext = require('../../services/extension-service');
let utils = require('../../services/utils-service');
let authService = require('../../services/auth-service');
let request = require('request');
const fs = require('fs');
const path = require('path');
const aws = require('aws-sdk');
let moment = require('moment-timezone');
moment.locale('pt-BR');

const options = {
    params: {
        Bucket: global.AWS_BUCKET_NAME
    },
    accessKeyId: global.AWS_ID,
    secretAccessKey: global.AWS_SECRET,
}
const s3 = new aws.S3(options);

exports.uploadMedias = async (medias) => {
    var mediaURLs = [];

    const _medias = utils.getDefaultIfNeeded(medias, [])
    for (const [key, base64] of Object.entries(_medias)) {
        const mediaURL = await uploadFromBase64(base64);
        mediaURLs.push(mediaURL);
    }

    return mediaURLs;
};

const uploadMedia = exports.uploadMedia = async (fileKey, base64) => {
    const mediaURL = await uploadFromBase64(base64, fileKey);

    return mediaURL;
};

exports.uploadMediaFromURL = async (url, userId) => {
    var options = {
        uri: url,
        encoding: null
    };
    request(options, async function (error, response, body) {
        if (error || response.statusCode !== 200) {
            console.error("failed to get image");
            console.error(error);
        } else {
            const fileKey = `media/${userId}`;
            await uploadFromBuffer(body, 'image/png', fileKey);
        }
    });

}

const upload = exports.upload = async (filePath, fileName) => {
    if (!fs.existsSync(filePath)) {
        return '';
    }

    // Read content from the file
    const fileContent = fs.readFileSync(filePath);
    const key = fileName ?? fileNameGenerator(filePath);

    // Setting up S3 upload parameters
    const params = {
        Bucket: global.AWS_BUCKET_NAME,
        Key: key, // File name you want to save as in S3
        Body: fileContent,
        ContentType: 'image/png',
        ACL: 'public-read',
    };

    // Uploading files to the bucket
    const stored = await s3.upload(params).promise();
    return stored.Location;
};

const uploadFromBase64 = exports.uploadFromBase64 = async (base64, fileKey) => {
    const mimeType = utils.extractMimetypeFromBase64(base64);
    const base64Buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    return await uploadFromBuffer(base64Buffer, mimeType, fileKey);
};

const uploadFromBuffer = exports.uploadFromBuffer = async (buffer, mimeType, fileKey) => {
    const key = fileKey ?? fileNameGenerator();

    // Setting up S3 upload parameters
    const params = {
        Bucket: global.AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: mimeType,
        ACL: 'public-read',
    };

    var stored = '';

    try {
        if (utils.isProduction()) {
            stored = await s3.upload(params).promise();
        }
    } catch (error) {
        console.error(error)
        return
    }

    return utils.isProduction() ? stored.Location : `${global.APP_LOGO_URL}?random=${utils.getRandomInt(0, 9000)}`;
};

exports.deleteMedias = async (medias, provider, checkIfIsInUse = false) => {
    if (typeof provider !== 'object') {
        console.error('Missing provider');
        return
    }

    if (!Array.isArray(medias)) {
        medias = [medias];
    }


    await utils.asyncForEach(medias, async (url) => {
        var shouldDelete = true;
        if (checkIfIsInUse) {
            shouldDelete = await shouldDeleteMedia(url, provider.model);
        }

        if (!shouldDelete) {
            console.info('Não foi possivel remover as imagens pois elas estão sendo usadas em mais de um registro')
            return false;
        }

        if (!utils.isProduction()) {
            return true;
        }

        const key = extractKeyFromUrl(url);
        // Setting up S3 upload parameters
        const params = {
            Bucket: global.AWS_BUCKET_NAME,
            Key: key,
        };

        try {
            await s3.headObject(params).promise()
            try {
                await s3.deleteObject(params).promise()
                return true;
            } catch (err) {
                console.error(`ERROR in file Deleting: ${JSON.stringify(err)}`)
                return false;
            }
        } catch (err) {
            console.error(`File not Found ERROR: ${err.code}`)
            return false;
        }

    });
};

exports.moveImages2AWS = async (provider, filePath) => {
    const docs = await provider.get();
    var counterAlreadyInS3 = 0
    var counterSucess = 0
    var counterFail = 0
    var counterNoMedia = 0

    await utils.asyncForEach(docs, async (doc) => {
        const medias = utils.getDefaultIfNeeded(doc.medias, [])
        if (medias.length == 0) {
            counterNoMedia += 1
        }

        await utils.asyncForEach(medias, async (media) => {
            if (media.includes(global.AWS_BUCKET_NAME)) {
                counterAlreadyInS3 += 1
            } else {
                const fileName = `${filePath}/${media}.png`;
                const location = await upload(fileName);
                if (location != '') {
                    await addMedia(doc.id, location, provider.model);
                    await removeMedia(doc.id, media, provider.model);
                    counterSucess += 1
                } else {
                    counterFail += 1
                }
            }
        });
    });

    return `images tranported: [docs without media:${counterNoMedia} | already in aws:${counterAlreadyInS3} | success:${counterSucess} | fails:${counterFail}]`;
}

exports.moveMedias2AWS = async (provider, filePath) => {
    const docs = await provider.get();
    var counterSucess = 0
    var counterFail = 0
    var counterNoMedia = 0

    await utils.asyncForEach(docs, async (doc) => {
        const medias = utils.getDefaultIfNeeded(doc.medias, [])
        const filePathFull = `${filePath}/${doc._id}.png`;
        if (!fs.existsSync(filePathFull)) {
            counterNoMedia += 1
        } else {
            try {
                const fileKey = `media/${doc._id}`;
                const location = await upload(filePathFull, fileKey);
                counterSucess += 1
            } catch (err) {
                console.error(err)
                counterFail += 1;
            }
        }
    });


    return `images tranported: [docs without media:${counterNoMedia} | success:${counterSucess} | fails:${counterFail}]`;
}

async function shouldDeleteMedia(media, model) {

    var query = authService.buildQuery({
        medias: { $in: [media] },
        status: Enum.Status.activated,
    });


    let response = await model.find(query);
    return response.length < 1;
}

async function addMedia(id, medias, model) {
    if (!Array.isArray(medias)) {
        medias = [medias];
    }

    let response = await model.findByIdAndUpdate(id,
        { $push: { medias: medias } },
        { new: true, timestamps: false }
    );

    return response;
}

async function removeMedia(id, medias, model) {
    if (!Array.isArray(medias)) {
        medias = [medias];
    }

    let response = await model.findByIdAndUpdate(id,
        { $pullAll: { medias: medias } },
        { new: true, timestamps: false }
    );

    return response;
}

function extractKeyFromUrl(url) {
    const regex = /amazonaws\.com\/(.*)$/g;
    const match = regex.exec(url);
    var key = utils.getDefaultIfNeeded(match[1]);

    if (!key) {
        const found = url.split('/');
        key = `${found[found.length - 2]}/${found[found.length - 1]}`;
    }

    return key;
}

function fileNameGenerator(fileName) {
    const date = moment().utc().format('YYYYMMDDhmmss');
    const rand = utils.getRandomInt(1000000, 9999999);
    const key = `${date}-${rand}`;

    return `${key}`.trim();
}