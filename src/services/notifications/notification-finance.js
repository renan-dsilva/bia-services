let mongoose = require('mongoose');
let parentProvider = require('../../app/parents/parent-provider');
let studentProvider = require('../../app/students/student-provider');
let Enum = require('../../enums');
let utils = require('../utils-service');
let ext = require('../extension-service');
let chatSeed = require('../../seeds/chat-seed');
let moment = require('moment-timezone');
moment.locale('pt-BR');


exports.chargeCreatedPush = async (charge, completion) => {
    var body = '';
    var title = '';
    let student = await studentProvider.getByParent(charge.parent);

    let monthlyDesc = moment(charge.due_date).format('DD/MM')
    title = 'Boleto em Disponível';
    body = `Não se esqueça que em ${monthlyDesc} vence seu boleto.`
    let discount = utils.getDefaultIfNeeded(charge.discount, 0);
    if (discount > 0) {
        title = `${discount}% de Desconto`;
        body += '\nNão corra o risco de perder seu desconto.';
    }

    var notifyBase = {
        type: Enum.NotifyType.push,
        title: title,
        body: body,
        student: student._id,
        receiver: Enum.UserOrigin.parent,
        sender: Enum.UserOrigin.staff,
        sender_id: 'support',
        channel: Enum.Channel.finance,
        channel_id: `${charge._id}`,
        external_url: `${charge.invoice_url}`,
    };
    let parents = await parentProvider.getByStudent(student);
    parents.forEach(parent => {
        let parentInfo = {
            fcm_token: parent.fcm_token,
            receiver_id: parent.id,
        };
        let notify = Object.assign(parentInfo, notifyBase);

        completion(notify)
    });
}

exports.chargeCreatedEmail = async (charge, completion) => {
    let data = {
        type: Enum.NotifyType.email,
        school_name: charge.school.name,
        charge_desc: charge.desc.replace(/\n/g, "<br />"),
        charge_link: charge.invoice_url,
    }
    var notify = await chatSeed.financeCreatedPayload(data);
    charge.parent.emails.forEach(email => {
        notify.to = email;
        completion(notify)
    });
}

exports.chargeOnDayPush = async (charge, completion) => {
    var body = '';
    var title = '';
    let student = await studentProvider.getByParent(charge.parent);
    title = 'Sua fatura vence hoje!';
    body = `Para facilitar, acesse o boleto pelo app ${global.APP_NAME}.`

    var notifyBase = {
        type: Enum.NotifyType.push,
        title: title,
        body: body,
        student: student._id,
        receiver: Enum.UserOrigin.parent,
        sender: Enum.UserOrigin.staff,
        sender_id: 'support',
        channel: Enum.Channel.finance,
        channel_id: `${charge._id}`,
        external_url: `${charge.invoice_url}`,
    };
    let parents = await parentProvider.getByStudent(student);
    parents.forEach(parent => {
        let parentInfo = {
            fcm_token: parent.fcm_token,
            receiver_id: parent.id,
        };
        let notify = Object.assign(parentInfo, notifyBase);

        completion(notify)
    });
}

exports.chargeOnDayEmail = async (charge, completion) => {
    let data = {
        type: Enum.NotifyType.email,
        school_name: charge.school.name,
        charge_desc: charge.desc.replace(/\n/g, "<br />"),
        charge_link: charge.invoice_url,
    }
    var notify = await chatSeed.financeOnDayPayload(data);
    charge.parent.emails.forEach(email => {
        notify.to = email;
        completion(notify)
    });
}

exports.chargeOverduePush = async (charge, completion) => {
    var body = '';
    var title = '';
    let student = await studentProvider.getByParent(charge.parent);
    if (charge.charge_state != Enum.ChargeState.open) {
        title = 'Boleto em Aberto';
        body = `Seu boleto encontra-se em aberto. Aconteceu alguma coisa? Passe aqui na escola para conversarmos`;
    } else {
        let monthlyDesc = moment(charge.due_date).format('DD/MM')

        title = 'Boleto em Disponível';
        body = `Não se esqueça que em ${monthlyDesc} vence seu boleto.`
        let discount = utils.getDefaultIfNeeded(charge.discount, 0);
        if (discount > 0) {
            title = `${discount}% de Desconto`;
            body += '\nNão corra o risco de perder seu desconto.';
        }
    }

    var notifyBase = {
        type: Enum.NotifyType.push,
        title: title,
        body: body,
        student: student._id,
        receiver: Enum.UserOrigin.parent,
        sender: Enum.UserOrigin.staff,
        sender_id: 'support',
        channel: Enum.Channel.finance,
        channel_id: `${charge._id}`,
        external_url: `${charge.invoice_url}`,
    };
    let parents = await parentProvider.getByStudent(student);
    parents.forEach(parent => {
        let parentInfo = {
            fcm_token: parent.fcm_token,
            receiver_id: parent.id,
        };
        let notify = Object.assign(parentInfo, notifyBase);

        completion(notify)
    });
}

exports.chargeOverdueEmail = async (charge, completion) => {
    let data = {
        type: Enum.NotifyType.email,
        school_name: charge.school.name,
        charge_desc: charge.desc.replace(/\n/g, "<br />"),
        charge_link: charge.invoice_url,
    }
    var notify = await chatSeed.financeCreatedPayload(data);
    charge.parent.emails.forEach(email => {
        notify.to = email;
        completion(notify)
    });
}

exports.chargeDeletedPush = async (charge, completion) => {
    var body = '';
    var title = '';
    let student = await studentProvider.getByParent(charge.parent);
    if (charge.charge_state != Enum.ChargeState.open) {
        title = 'Boleto em Aberto';
        body = `Seu boleto encontra-se em aberto. Aconteceu alguma coisa? Passe aqui na escola para conversarmos`;
    } else {
        let monthlyDesc = moment(charge.due_date).format('DD/MM')

        title = 'Boleto em Disponível';
        body = `Não se esqueça que em ${monthlyDesc} vence seu boleto.`
        let discount = utils.getDefaultIfNeeded(charge.discount, 0);
        if (discount > 0) {
            title = `${discount}% de Desconto`;
            body += '\nNão corra o risco de perder seu desconto.';
        }
    }

    var notifyBase = {
        type: Enum.NotifyType.push,
        title: title,
        body: body,
        student: student._id,
        receiver: Enum.UserOrigin.parent,
        sender: Enum.UserOrigin.staff,
        sender_id: 'support',
        channel: Enum.Channel.finance,
        channel_id: `${charge._id}`,
        external_url: `${charge.invoice_url}`,
    };
    let parents = await parentProvider.getByStudent(student);
    parents.forEach(parent => {
        let parentInfo = {
            fcm_token: parent.fcm_token,
            receiver_id: parent.id,
        };
        let notify = Object.assign(parentInfo, notifyBase);

        completion(notify)
    });
}

exports.chargeDeletedEmail = async (charge, completion) => {
    let data = {
        type: Enum.NotifyType.email,
        school_name: charge.school.name,
        charge_desc: charge.desc.replace(/\n/g, "<br />"),
        charge_link: charge.invoice_url,
    }
    var notify = await chatSeed.financeCreatedPayload(data);
    charge.parent.emails.forEach(email => {
        notify.to = email;
        completion(notify)
    });
}

exports.chargeReceivedPush = async (charge, completion) => {
    var title = 'Obrigado!!!!';
    var body = 'Recebemos o seu pagamento, tudo certo 😎';
    let student = await studentProvider.getByParent(charge.parent);

    var notifyBase = {
        type: Enum.NotifyType.push,
        title: title,
        body: body,
        student: student._id,
        receiver: Enum.UserOrigin.parent,
        sender: Enum.UserOrigin.staff,
        sender_id: 'support',
        channel: Enum.Channel.finance,
        channel_id: `${charge._id}`,
    };
    let parents = await parentProvider.getByStudent(student);
    parents.forEach(parent => {
        let parentInfo = {
            fcm_token: parent.fcm_token,
            receiver_id: parent.id,
        };
        let notify = Object.assign(parentInfo, notifyBase);

        completion(notify)
    });
}

exports.chargeReceivedEmail = async (charge, completion) => {
    let data = {
        type: Enum.NotifyType.email,
        school_name: charge.school.name,
        charge_desc: 'Recebemos o seu pagamento, tudo certo 😎',
    }
    var notify = await chatSeed.paymentThanksToParentPayload(data);
    charge.parent.emails.forEach(email => {
        notify.to = email;
        completion(notify)
    });
}
