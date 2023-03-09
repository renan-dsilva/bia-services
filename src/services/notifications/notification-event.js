let mongoose = require('mongoose');
let parentProvider = require('../../app/parents/parent-provider');
let studentProvider = require('../../app/students/student-provider');
let Enum = require('../../enums');
let utils = require('../utils-service');
let ext = require('../extension-service');
let chatSeed = require('../../seeds/chat-seed');
let moment = require('moment-timezone');
moment.locale('pt-BR');


exports.eventPush = async (event, parent, completion) => {
    var body = '';
    var title = '';

    const today = moment().add(global.APP_TIME_OFFSET_DEFAULT, 'minute');
    const period_ini = moment(event.period_ini).add(global.APP_TIME_OFFSET_DEFAULT, 'minute');
    const period_end = moment(event.period_end).add(global.APP_TIME_OFFSET_DEFAULT, 'minute');
    const isToday = period_ini.isSame(today, 'day');
    const isTomorrow = period_ini.isAfter(today, 'day');

    title = `É hoje! 🤗`;
    if (isTomorrow) {
        title = `Lembrete para amanhã! 😉`;
    }

    body = event.name
    if (!event.all_day) {
        const hrIni = moment(period_ini, 'YYYY-MM-DD').format('HH:mm');
        const hrEnd = moment(period_end, 'YYYY-MM-DD').format('HH:mm');
        body += `\n${hrIni} às ${hrEnd}`;
    }

    var notify = {
        fcm_token: parent.fcm_token,
        receiver_id: parent.id,
        type: Enum.NotifyType.push,
        title: title,
        body: body,
        receiver: Enum.UserOrigin.parent,
        sender: Enum.UserOrigin.staff,
        sender_id: 'support',
        channel: Enum.Channel.event,
        channel_id: `${event._id}`,
    };

    completion(notify)
}

exports.eventEmail = async (charge, completion) => {
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
