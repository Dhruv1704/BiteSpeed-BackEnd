const express = require('express');
const router = express.Router();
const {body, validationResult} = require('express-validator');
const clientDB = require('../db');

router.get('/', function(req, res, next) {
    res.json("Use POST method to identify contact.(via postman or curl)");
});

router.post('/', [
    body('email', 'Enter a valid email').optional({nullable: true}).isEmail(),
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
        const contact = createContactJson([newContactRes.row]);
        return res.json({contact});
    }

    let linkedIdSet = new Set();
    emailOrPhonerows.forEach((row)=>{
        if(row.linkedid!=null){
            linkedIdSet.add(row.linkedid);
        }
        linkedIdSet.add(row.id);
    })

    const linkedRowsQueryRes = await getLinkedContacts(Array.from(linkedIdSet));
    if(linkedRowsQueryRes.status==="error") return res.status(400).json(linkedRowsQueryRes);


    const linkedRows = linkedRowsQueryRes.rows;
    const rowsAfterPrimaryCheckRes = await rowPrimaryToSecondaryCheck(linkedRows, Array.from(linkedIdSet));
    if(rowsAfterPrimaryCheckRes.status==="error") return res.status(400).json(rowsAfterPrimaryCheckRes);

    const rowsAfterPrimaryCheck = rowsAfterPrimaryCheckRes.rows;

    // checking new email or phone number
    let isEmailExist= !email?true:false;
    let doesPhoneExist= !phoneNumber?true:false;
    linkedRows.forEach((row)=>{
        if(row.email===email)isEmailExist=true;
        if(phoneNumber && row.phonenumber===phoneNumber.toString())doesPhoneExist=true;
    });

    if(!isEmailExist || !doesPhoneExist){
        // create new secondary contact for new information
        const newContactRes = await createNewContact(email, phoneNumber, rowsAfterPrimaryCheck.length, rowsAfterPrimaryCheck[0].linkedid || rowsAfterPrimaryCheck[0].id);
        if(newContactRes.status==="error") return res.status(400).json(newContactRes);
        linkedRows.push(newContactRes.row);
    }

    const contact = createContactJson(rowsAfterPrimaryCheck);
    return res.json({contact});
});

// gets rows with email or phone number.
async function getRowsWithEmailOrPhone(email, phoneNumber) {
    try {
        const sql = `SELECT * FROM contact WHERE email=$1 OR phoneNumber=$2`;
        const {rows} = await clientDB.query(sql, [email, phoneNumber]);
        return {status: "success",rows};
    }catch (e){
        return {status: "error", message: e.message};
    }
}
// gets rows with linkedId and id.
async function getLinkedContacts(linkedIds) {
    try {
        const sql = `SELECT * FROM contact WHERE id=ANY($1) OR linkedId=ANY($1)`;
        const {rows} = await clientDB.query(sql, [linkedIds]);
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
    phoneNumbersSet.delete(primaryPhone)
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

async function rowPrimaryToSecondaryCheck(rows, linkedIds){
    let countPrimary = 0;
    rows.forEach((row)=>{
        if(row.linkprecedence==="primary")countPrimary++;
    });
    if(countPrimary>1) {
        // need to convert primary to secondary except oldest one.
        try {
            const sqlGetOldestPrimary = `SELECT *
                                         FROM contact
                                         where id = ANY ($1)
                                         ORDER BY createdAt asc 
                                         Limit 1`;
            const OldestPrimaryRowRes = await clientDB.query(sqlGetOldestPrimary, [linkedIds]);
            const newLinkedId = OldestPrimaryRowRes.rows[0].id;
            //update other linked rows to secondary and linkedId to newLinkedId
            const updateOtherLinkedRows = `UPDATE contact
                                           SET linkedId = $2,
                                               linkPrecedence = 'secondary',
                                               updatedAt = NOW()
                                           WHERE (id = ANY ($1) OR linkedId = ANY ($1))
                                             AND id <> $2`
            await clientDB.query(updateOtherLinkedRows, [linkedIds, newLinkedId]);

            const {rows} = await clientDB.query(`SELECT * FROM contact WHERE id=$1 OR linkedId=$1`, [newLinkedId]);
            return {status: "success",rows};
        }catch (e){
            return {status: "error", message: e.message};
        }
    }
    return {status: "success",rows};
}

module.exports = router;
