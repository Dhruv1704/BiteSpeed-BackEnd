var express = require('express');
var router = express.Router();
const {body, validationResult} = require('express-validator');

/* GET users listing. */
router.post('/', [
    body('email', 'Enter a valid email').optional({nullable: true}).isEmail(),
    body('phoneNumber', 'Enter a valid phone number').optional({nullable: true}).isMobilePhone("en-IN")
],function(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({type: "error", message: errors.array()});
    }
    const {email, phoneNumber} = req.body;

    res.json(email+" "+ phoneNumber);
});

module.exports = router;
