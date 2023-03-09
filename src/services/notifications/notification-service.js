'use strict';

let mongoose = require('mongoose');
let parentProvider = require('../../app/parents/parent-provider');
let studentProvider = require('../../app/students/student-provider');
let chatroomProvider = require('../../app/chatrooms/chatroom-provider');
let classroomProvider = require('../../app/classrooms/classroom-provider');
let medicineProvider = require('../../app/medicines/medicine-provider');
let schoolProvider = require('../../app/schools/school-provider');
const Student = mongoose.model('Student');
exports.model = Student
let Enum = require('../../enums');
let utils = require('../utils-service');
let ext = require('../extension-service');

const notifyFinance = require('./notification-finance')
const notifyEvent = require('./notification-event')
const emailService = require('../email-service');
const pushService = require('../push-service');

let moment = require('moment-timezone');
moment.locale('pt-BR');

exports.attendance = async (attendances) => {
    try {
        if (!Array.isArray(attendances)) {
            attendances = [attendances];
        }

        await utils.asyncForEach(attendances, async (attendance) => {
            var title = '';
            var body = '';
            let hasArrived = attendance.checkin != null;
            let hasLeave = attendance.checkout != null && attendance.checkout != '';
            let student = await studentProvider.getById(attendance.student);
            let classroom = await classroomProvider.getById(attendance.classroom);
            let staff = await staffProvider.getById(attendance.staff);
            let article = student.gender == 'M' ? 'o' : 'a';
            let studentName = student.name.firstName();
            let staffName = staff.name.firstName();

            var notifyBase = {
                student: student._id,
                receiver: Enum.UserOrigin.parent,
                sender: Enum.UserOrigin.staff,
                sender_id: staff._id,
                channel: Enum.Channel.attendance,
                channel_id: attendance._id,
                sent: false,
                is_failed: false,
            };

            if (!hasArrived && !hasLeave) {
                await removeNotSent(notifyBase);
            } else {

                if (hasArrived && !hasLeave) {
                    title = 'Chegou Bem!';
                    body = global.PUSH_ATTENDANCE_ARRIVE_TMPL
                        .replace('{0}', studentName)
                        .replace('{1}', classroom.name)
                        .replace('{2}', article)
                        .replace('{3}', staffName)
                } else if (hasLeave) {
                    title = 'A Caminho de Casa!';
                    body = global.PUSH_ATTENDANCE_LEAVE_TMPL
                        .replace('{0}', studentName)
                }

                notifyBase = Object.assign({
                    title: title,
                    body: body,
                }, notifyBase);

                let parents = await parentProvider.getByStudent(attendance.student);
                await utils.asyncForEach(parents, async (parent) => {
                    let parentInfo = {
                        fcm_token: parent.fcm_token,
                        receiver_id: parent.id,
                    };
                    let notify = Object.assign(parentInfo, notifyBase);

                    await save(notify);
                });
            }
        });

    } catch (e) {
        console.error(e);
    }
}

exports.report = async (reports) => {
    try {
        await utils.asyncForEach(reports, async (report) => {
            let student = await studentProvider.getById(report.student);
            let school = await schoolProvider.getById(report.school);
            let title = student.name.firstName() + ' - ' + school.name;
            let body = report.title + "\n" + report.desc;

            var media = '';
            if (typeof report.medias !== 'undefined' && report.medias != null && report.medias.length > 0) {
                media = `${global.API_URL}/domain/report/${report.medias[0]}/${school._id}`;
            }

            var notifyBase = {
                title: title,
                body: body,
                student: report.student,
                receiver: Enum.UserOrigin.parent,
                sender: Enum.UserOrigin.staff,
                sender_id: report.staff,
                channel: Enum.Channel.report,
                channel_id: report._id,
                media_path: media,
                sent: false,
                is_failed: false,
            };

            let parents = await parentProvider.getByStudent(report.student);
            await utils.asyncForEach(parents, async (parent) => {
                let parentInfo = {
                    fcm_token: parent.fcm_token,
                    receiver_id: parent.id,
                };
                let notify = Object.assign(parentInfo, notifyBase);

                await save(notify);
            });
        });

    } catch (e) {
        console.error(e);
    }
}

exports.medicineOccurrence = async (occurrence) => {
    try {
        if (occurrence.taken) {
            let medicine = await medicineProvider.getById(occurrence.medicine);
            let student = await studentProvider.getById(medicine.student);
            let title = medicine.name;
            let body = student.name.firstName() + ' tomou ' + medicinePresentationDesc(medicine);
            let staffId = utils.extractIdFrom(occurrence.staff);

            var notifyBase = {
                title: title,
                body: body,
                student: medicine.student,
                receiver: Enum.UserOrigin.parent,
                sender: Enum.UserOrigin.staff,
                sender_id: staffId,
                channel: Enum.Channel.medicine,
                channel_id: medicine._id,
                sent: false,
                is_failed: false,
            };

            let parents = await parentProvider.getByStudent(medicine.student);
            await utils.asyncForEach(parents, async (parent) => {
                let parentInfo = {
                    fcm_token: parent.fcm_token,
                    receiver_id: parent.id,
                };
                let notify = Object.assign(parentInfo, notifyBase);

                await save(notify);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

exports.finance = async (charge, event, sendEmail = true, sendPush = true) => {
    try {
        const completion = (notify) => {
            run(notify, sendEmail, sendPush)
        };

        switch (event) {
            case Enum.AsaasWebhookEvents.payment_created:
                notifyFinance.chargeCreatedPush(charge, completion);
                notifyFinance.chargeCreatedEmail(charge, completion);
                break;
            case Enum.AsaasWebhookEvents.payment_on_day:
                notifyFinance.chargeOnDayPush(charge, completion);
                notifyFinance.chargeOnDayEmail(charge, completion);
                break;
            case Enum.AsaasWebhookEvents.payment_deleted:
                notifyFinance.chargeDeletedPush(charge, completion);
                notifyFinance.chargeDeletedEmail(charge, completion);
                break;
            case Enum.AsaasWebhookEvents.payment_received:
                notifyFinance.chargeReceivedPush(charge, completion);
                notifyFinance.chargeReceivedEmail(charge, completion);
                break;
            case Enum.AsaasWebhookEvents.payment_overdue:
                notifyFinance.chargeOverduePush(charge, completion);
                notifyFinance.chargeOverdueEmail(charge, completion);
                break;

            default:
                break;
        }
    } catch (e) {
        console.error(e);
    }

}

exports.chat = async (chat, email = true, push = true, sendOnlyTo = null) => {
    try {
        const schoolId = utils.extractIdFrom(chat.school);
        const school = await schoolProvider.getById(schoolId);
        const chatroomId = utils.extractIdFrom(chat.chatroom);
        const chatroom = await chatroomProvider.getById(chatroomId);
        const sender = chat.sender;

        var title = global.APP_NAME;
        if (sender.id.toLowerCase() === 'suporte' && school) {
            title = school.name;
        } else {
            title = chat.sender.name.firstLastName();
            if (chatroom.students_list != null && chatroom.students_list != '') {
                title += ` - ${chatroom.students_list}`;
            }
        }

        var subject = chat.subject;
        if (!subject && school) {
            subject = school.name;
        }

        let body = utils.getDefaultIfNeeded(chat.body)
        var notifyBase = {
            title: title,
            body: body,
            receiver: '',
            sender: chat.origin,
            sender_id: chat.sender.id,
            channel_id: `${chatroomId}`,
            channel: Enum.Channel.chat,
        };

        if (body && chatroom) {
            await utils.asyncForEach(chatroom.members, async (member) => {
                if (chat.sender.id != member) {
                    let receiver = await getUserFromId(member);
                    var shouldSend = true;

                    if (receiver) {
                        if (sendOnlyTo) {
                            shouldSend = (sendOnlyTo == receiver.origin);
                        }

                        if (shouldSend) {
                            let students = utils.getDefaultIfNeeded(receiver.students, [Student()]);
                            let notifyInfo = {
                                type: Enum.NotifyType.push,
                                student: students[0],
                                fcm_token: receiver.fcm_token,
                                receiver_id: receiver.id,
                            };
                            let notify = Object.assign(notifyInfo, notifyBase);

                            run(notify, email, push);
                        }
                    }
                }
            });
        }

    } catch (e) {
        console.error(e);
    }
}

exports.event = async (event, parent, sendEmail = true, sendPush = true) => {
    try {
        const completion = (notify) => {
            run(notify, sendEmail, sendPush)
        };

        notifyEvent.eventPush(event, parent, completion);
        // notifyEvent.eventEmail(event, parent, completion);
    } catch (e) {
        console.error(e);
    }

}

function medicinePresentationDesc(medicine) {
    var list;
    if (medicine.dose > 1) {
        list = presentationsPlural();
    } else {
        list = presentationsSingle();
    }

    return medicine.dose + ' ' + list[medicine.presentation] + ' de ' + medicine.name;
}

function presentationsPlural() {
    let list = {
        'COMPRIMIDOS': 'comprimidos',
        'GOTAS': 'gotas',
        'MILILITROS': 'mililitros(ml)',
        'APLICACAO': 'aplicações',
        'ENVELOPE': 'envelopes',
        'GRAMAS': 'gramas(g)',
        'MILIGRAMAS': 'miligramas(mg)',
        'POMADA_CREME': 'pomada/Creme',
        'COLHER_CHA': 'colheres de Chá',
        'COLHER_SOPA': 'colheres de Sopa',
        'OUTROS': 'outros',
    };

    return list;
}

function presentationsSingle() {
    let list = {
        'COMPRIMIDOS': 'comprimido',
        'GOTAS': 'gotas',
        'MILILITROS': 'mililitros(ml)',
        'APLICACAO': 'aplicação',
        'ENVELOPE': 'envelope',
        'GRAMAS': 'gramas(g)',
        'MILIGRAMAS': 'miligramas(mg)',
        'POMADA_CREME': 'pomada/Creme',
        'COLHER_CHA': 'colher de Chá',
        'COLHER_SOPA': 'colher de Sopa',
        'OUTROS': 'outros',
    };

    return list;
}

async function getUserFromId(user) {
    var source;
    user = utils.extractIdFrom(user);

    source = await parentProvider.getById(user);
    if (source) {
        source.origin = Enum.UserOrigin.parent;
    } else {
        source = await staffProvider.getById(user);
        if (source) {
            source.origin = Enum.UserOrigin.staff;
        }
    }

    return source;
}

function run(notify, sendEmail, sendPush) {
    const type = utils.getDefaultIfNeeded(notify.type, Enum.NotifyType.push);

    switch (type) {
        case Enum.NotifyType.push:
            if (sendPush) {
                pushService.send(notify);
            }
            break;
        case Enum.NotifyType.email:
            if (sendEmail)
                emailService.send(notify);
            break;
        default:
            break;
    }

}
