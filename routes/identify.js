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
    if(emailOrPhoneQueryRes.status==="error") return res.status(400).json(emailOrPhoneQueryRes);

    const emailOrPhonerows = emailOrPhoneQueryRes.rows;

    if(emailOrPhonerows.length===0){
        // create new primary contact
        const newContactRes = await createNewContact(email, phoneNumber, 0);
        if(newContactRes.status==="error") return res.status(400).json(newContactRes);
        const contact = createContactJson([newContact.row]);
        return res.json({contact});
    }

    let linkedIdSet = new Set();
    emailOrPhonerows.forEach((row)=>{
        if(row.linkedid!=null){
            linkedIdSet.add(row.linkedid);
        }
    })

    const linkedRowsQueryRes = await getLinkedContacts(Array.from(linkedIdSet));
    if(linkedRowsQueryRes.status==="error") return res.status(400).json(linkedRowsQueryRes);

    const linkedRows = linkedRowsQueryRes.rows;

    const rowsAfterPrimaryCheck = await rowPrimaryCheck(linkedRows, linkedIdSet);
    if(rowsAfterPrimaryCheck.status==="error") return res.status(400).json(rowsAfterPrimaryCheck);

    // checking new email or phone number
    let isEmailExist= !email?true:false;
    let doesPhoneExist= !phoneNumber?true:false;
    linkedRows.forEach((row)=>{
        if(row.email===email)isEmailExist=true;
        if(row.phonenumber===phoneNumber)doesPhoneExist=true;
    });

    if(!isEmailExist || !doesPhoneExist){
        // create new secondary contact for new information
        const newContactRes = await createNewContact(email, phoneNumber, linkedRows.length, linkedRows[0].linkedid || linkedRows[0].id);
        if(newContactRes.status==="error") return res.status(400).json(newContactRes);
        linkedRows.push(newContactRes.row);
    }

    const contact = createContactJson(rowsAfterPrimaryCheck.rows);
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
async function getLinkedContacts(linkedIds) {
    try {
        const ids = `(${linkedIds.join(", ")})`;
        const sql = `SELECT * FROM contact WHERE id in ${ids} OR linkedId in ${ids}`;
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
    try {
        const sql = `INSERT INTO contact (email, phoneNumber, linkPrecedence, linkedID)
                     VALUES ($1, $2, $3, $4) RETURNING *`;
        const values = [email, phoneNumber, existingRowsCount === 0 ? "primary" : "secondary", linkedId];
        const {rows} = await clientDB.query(sql, values);
        return {status: "success",row: rows[0]};
    }catch (e){
        return {status: "error", message: e.message};
    }
}

async function rowPrimaryCheck(rows, linkedIdSet){


}

module.exports = router;
