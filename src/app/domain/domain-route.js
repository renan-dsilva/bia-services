'use strict';

let express = require('express');
let router = express.Router();
let controller = require('./domain-controller');
let authService = require('../../services/auth-service');

// Auths
router.post('/authenticate', controller.authenticate);

router.post('/refreshToken', authService.authorize, controller.refreshToken);
router.post('/forgotPassword', controller.forgotPassword);
router.post('/validatePin', controller.validatePin);
router.put('/updatePassword', authService.authorize, controller.updatePassword);
router.put('/updatePasswordFromForgot', authService.authorize, controller.updatePasswordFromForgot);
router.put('/subscribe/:token', controller.subscribe);
router.put('/unsubscribe/:token', controller.unsubscribe);

router.get('/version', controller.version);
router.get('/activate/:token', controller.activate);
router.post('/save-media', authService.authorize, controller.saveMedia);
router.post('/delete-media', authService.authorize, controller.deleteMedia);

// Medias access

// Videos
router.get('/video/:id', authService.authorize, controller.videos);

module.exports = router;