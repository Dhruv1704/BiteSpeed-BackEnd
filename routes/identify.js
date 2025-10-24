const express = require('express');
const router = express.Router();
const {body, validationResult} = require('express-validator');
const clientDB = require('../db');

/* GET users listing. */
router.post('/', [
    body('email', 'Enter a valid email').optional({nullable: true}).isEmail(),
    body('phoneNumber', 'Enter a valid phone number').optional({nullable: true}).isMobilePhone("en-IN")
],async function(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({type: "error", message: errors.array()});
    }
    const {email, phoneNumber} = req.body;
    if(!email && !phoneNumber){
        return res.status(400).json({type: "error", message: "Both email and phone number cannot be empty"});
    }
    const result = await getRowsWithEmailOrPhone(req.body);
    if(result.status==="error") return res.status(400).json({type: "error", message: result.message});

    const rows = result.rows;
    return  res.json({type: "success", rows});
});


async function getRowsWithEmailOrPhone(rows, email, phoneNumber) {
    try {
        const sql = '';
        const {rows} = await clientDB.query(sql);
        return {status: "success",rows};
    }catch (e){
        return {status: "error", message: e.message};
    }
}

module.exports = router;
