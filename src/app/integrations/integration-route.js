'use strict';

let express = require('express');
let router = express.Router();
let controller = require('./integration-controller');
let authService = require('../../services/auth-service');

router.get('/', authService.authorize, controller.get);
router.post('/', authService.authorize, controller.post);
router.put('/:id', authService.authorize, controller.put);
router.delete('/:id', authService.authorize, controller.delete);
router.get('/:id', authService.authorize, controller.getById);
router.get('/name/:name', authService.authorize, controller.getByName);
router.get('/application/:application', authService.authorize, controller.getByApplication);

module.exports = router;