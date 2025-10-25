# Bitespeed Backend Task: Identity Reconciliation

## Overview

This project implements the **Identity Reconciliation API** for the Bitespeed Backend Task.

Built using **Node.js**, **Express**, and **PostgreSQL**, the API ensures each contact is linked under one primary identity while maintaining a clear hierarchy of secondary contacts.

---

## API Endpoint

**URL:**

```
https://bite-speed-back-end.vercel.app/identify
```

### **POST /identify**

Identifies and links a user by `email` or `phoneNumber`.
If a new combination is found, it intelligently creates or updates contact relationships.

#### Example Request:

```json
{
  "email": "doc@flux.com",
  "phoneNumber": "1234567890"
}
```

#### Example Response:

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@flux.com"], //first element being email of primary contact 
    "phoneNumbers": ["1234567890"], // first element being phoneNumber of primary contact
    "secondaryContactIds": []
  }
}
```

---

## Database Schema

```sql
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    phoneNumber VARCHAR(20),
    email VARCHAR(255),
    linkedId INT REFERENCES contacts(id) ON DELETE SET NULL,
    linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
    createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    deletedAt TIMESTAMP NULL
);
```

* **primary contact** → main identity record (oldest)
* **secondary contact** → linked records (additional emails/phones)

---

## Project Structure

```
/routes
 └── identify.js    # Core API logic
db.js   # PostgreSQL client connection
app.js           # Express server setup
```

### Key Functions

* `getRowsWithEmailOrPhone()` → fetch existing contacts with same email or phoneNumber.
* `getLinkedContacts()` → get all related (linked) contacts using id.
* `createNewContact()` → insert new contact entry
* `rowPrimaryToSecondaryCheck()` → ensure only one primary contact
* `createContactJson()` → format unified contact response

---

## Core Logic

1. **Lookup Existing Contacts**\
Fetch all contacts that match the given email or phoneNumber.

2. **Find All Linked Records**\
Collect their id and linkedId values to retrieve every related contact belonging to the same identity.

3. **Normalize Contact Hierarchy**\
Among linked records, promote the oldest contact (based on createdAt) as the primary contact, and update others as secondary.

4. **Handle New Information**\
If the incoming request includes a new email or phoneNumber not found in any linked record, create a new secondary contact linked to the primary.

5. **Generate Unified Response**\
Combine all linked contacts into a single structured JSON format.

---

## Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** PostgreSQL
* **Hosting:** Vercel

---

## Testing

Use **Postman** or **cURL** to test the API endpoint.
---

## Author

**Dhruv Singh Negi**
📧 [negidhruv1701@gmail.com](mailto:negidhruv1701@gmail.com)
🔗 [LinkedIn](https://linkedin.com/in/dhruv-s-n) | [Resume](https://drive.google.com/file/d/1G992MfsaxV1nTTk95TnRqYRyyTInete3/view?usp=sharing)

---
