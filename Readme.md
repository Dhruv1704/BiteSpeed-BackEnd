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
express-validator
