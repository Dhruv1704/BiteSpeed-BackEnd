const express = require('express');
const router = express.Router();
const {body, validationResult} = require('express-validator');
const clientDB = require('../db');
const {log} = require("debug");


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

    const emailOrPhoneQueryRes = await getRowsWithEmailOrPhone(email, phoneNumber);
    if(result.status==="error") return res.status(400).json({type: "error", message: result.message});

    const emailOrPhonerows = emailOrPhoneQueryRes.rows;

    if(emailOrPhonerows.length===0){
        // create new primary contact
        const newContact = await createNewContact(email, phoneNumber, 0);
        const contact = createContactJson([newContact]);
        return res.json({contact});
    }

    let linkedIdSet = new Set();
    emailOrPhonerows.forEach((row)=>{
        if(row.linkedid!=null){
            linkedIdSet.add(row.linkedid);
        }
    })

    const linkedRowsQueryRes = await getLinkedContacts(linkedIdSet);
    if(result.status==="error") return res.status(400).json({type: "error", message: result.message});

    const linkedRows = linkedRowsQueryRes.rows;

    const rowsAfterPrimaryCheck = (linkedRows, linkedIdSet);
    const contact = createContactJson(rowsAfterPrimaryCheck);
    return res.json({contact});
});

// gets rows with email or phone number.
async function getRowsWithEmailOrPhone(email, phoneNumber) {
    try {
        const sql = `SELECT * FROM contact WHERE email='${email}' OR phoneNumber='${phoneNumber}'`;
        const {rows} = await clientDB.query(sql);
        return {status: "success",rows};
    }catch (e){
        return {status: "error", message: e.message};
    }
}
// gets rows with linkedId and id.
async function getLinkedContacts(linkedId) {
    try {
        const sql = `SELECT * FROM contact WHERE id=${linkedId} OR linkedId=${linkedId}`;
        const {rows} = await clientDB.query(sql);
        return {status: "success",rows};
    }catch (e){
        return {status: "error", message: e.message};
    }
}

function createContactJson(rows){
    let primaryContatctId;
    let primaryEmail;
    let primaryPhone;
    const secondaryContactIds = [];
    const phoneNumbersSet = new Set();
    const emailSet = new Set();
    rows.forEach(row=>{
        if(row.linkprecedence==="primary"){
            primaryContatctId = row.id;
            primaryEmail = row.email;
            primaryPhone = row.phonenumber;
        }else secondaryContactIds.push(row.id)
        if(row.email!=null)emailSet.add(row.email);
        if(row.phonenumber!=null)phoneNumbersSet.add(row.phonenumber);
    });
    emailSet.delete(primaryEmail)
    emailSet.delete(primaryPhone)
    const emailArr = Array.from(emailSet);
    const phoneArr = Array.from(phoneNumbersSet);
    emailArr.unshift(primaryEmail)
    phoneArr.unshift(primaryPhone)
    const contact = {
        primaryContatctId,
        "emails": emailArr,
        "phoneNumbers": phoneArr,
        secondaryContactIds
    };
    return contact;
}

async function createNewContact(email, phoneNumber, existingRowsCount, linkedId=null){
    const sql = `INSERT INTO contact (email, phoneNumber, linkPrecedence, linkedID) VALUES ($1, $2, $3, $4) RETURNING *`;
    const values = [email, phoneNumber, existingRowsCount===0 ? "primary" : "secondary", linkedId];
    const {rows} = await clientDB.query(sql, values);
    return rows[0];
}

module.exports = router;
