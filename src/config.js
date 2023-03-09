global.APP_NAME = 'BIA - Business Impact Analysis';
global.APP_DESC = 'BIA - Business Impact Analysis';
global.APP_PHONE = '(11) 99889-0802';
global.APP_DOMAIN = 'bia.com.br';
global.APP_SITE_URL = `https://${global.APP_DOMAIN}`;
global.APP_MANAGER_URL = `https://admin.${global.APP_DOMAIN}`;
global.APP_EMAIL = `contato@${global.APP_DOMAIN}`;
global.APP_PHONE = `11998890802`;
global.API_URL = `https://${global.APP_DOMAIN}`;
global.APP_LOGO_URL = 'https://bia-cdn.s3-sa-east-1.amazonaws.com/assets/logo.png';
global.SALT_KEY = 'ZJB5RGUzMwzApmtArPMOhI97os3IVEsQ43rDVZeQ23c=';
global.APP_TIME_OFFSET_DEFAULT = -180; // in minuts
global.PUSH_DEV = 'diFG03a_qUlrkp0Fs5RkM6:APA91bEi0HoDoj0NxYRBbIvcsEKrJIqxM5zTqm5yi8UaRYuROFojUuHD5J92L0VQUbaHHv2OtutAeYG4XJEsXMy-vjSEKNPLcCM1JduSnZ5_hx39PnMKlh0fse1vB_h_-atOB8P05YqE';

// Profiles
global.GOD_PROFILE = 'Vader';

global.CURRENT_SESSION = '';
global.FIRST_ACCESS_PASSWORD = '123456';

// AWS
global.AWS_ID = process.env.AWS_ID;
global.AWS_SECRET = process.env.AWS_SECRET;
global.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;


module.exports = {
    connectionString: 'mongodb://mongo:veMWXwqrAPIvJvIxMiNF@containers-us-west-45.railway.app:7899', //.env.MONGO_CONNECT_BIA_MEDIA,
    database: 'bia_media',
    sendgridKey: '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',
    containerConnectinoString: 'TBD'
}

// Pushes
global.PUSH_ATTENDANCE_ARRIVE_TMPL = '';
global.PUSH_ATTENDANCE_LEAVE_TMPL = '';


