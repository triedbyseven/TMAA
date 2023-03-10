require('dotenv').config();
const express = require('express');
const next = require('next');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Papa = require('papaparse');
const fs = require('fs');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const myPromise = () => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(true);
  }, 1000);
});

const getDocument = async (username, email, phoneNumber) => {
  try {
    const TableName = process.env.AWS_DYNAMODB ? process.env.AWS_DYNAMODB : '';
    if (!TableName) throw new Error('Table name envrionment variable unavailable');

    const user_details = {
      username: username,
      email: email,
      phone: phoneNumber
    };

    const params = {
      TableName: TableName,
      FilterExpression: 'userDetails = :user_details',
      ExpressionAttributeValues: { ':user_details': user_details }
    };

    const response = await ddb.scan(params).promise();

    return response.Items[0];
  } catch (error) {
    console.error(error.code, error.message);
    return null;
  }
};

const sendEmail = async (providerName) => {
  const msg = {
    to: 'michael@joymd.com', // Change to your recipient
    from: 'hello@joymd.com', // Change to your verified sender
    subject: `SMS Text ERROR = ${providerName}`,
    text: `SMS Text ERROR - ${providerName}`,
    html: `<strong>Error parsing or sending CSV for ${providerName} .</strong>` 
  };

  await sgMail.send(msg);

  console.log('Error email sent');
};

const sendEmailWithAttachment = async (attachment, nameOfProvider) => {
  const msg = {
    to: ['henry@joymd.com', 'michael@joymd.com'], // Change to your recipient
    from: { email: 'hello@joymd.com', name: 'JOYMD'}, // Change to your verified sender
    subject: `SMS Text Report - ${nameOfProvider}`,
    text: `SMS Text Report - ${nameOfProvider}`,
    html: `<strong>SMS Text Report - ${nameOfProvider}</strong>`,
    attachments: [
      {
        content: attachment,
        filename: 'report-sms.csv',
        type: 'text/csv',
        disposition: 'attachment'
      }
    ]
  };

  await sgMail.send(msg);

  console.log('Email sent');
};

app.prepare().then(() => {
  const server = express();
  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ limit: '10mb' }));

  server.keepAliveTimeout = (4000 * 1000) + 1000;
  server.headersTimeout = (4000 * 1000) + 2000;


  server.post('/api/twilio', async (request, response) => {
    const errors = [];
    let providerNameForError = null;
    
    try {
      response.set('Content-Type', 'application/json');
      response.send(JSON.stringify({ success: true }));

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      const username = request.body.username;
      const emailAddress = request.body.emailAddress;
      const phone_number = request.body.phoneNumber;
      const fromPhoneNumber = request.body.fromPhoneNumber;
      const phoneNumbers = request.body.phoneNumbers;
      const messageBody = request.body.message;

      const document = await getDocument(username, emailAddress, phone_number);
      const nameOfProvider = document.nameOfProvider;
      providerNameForError = document.nameOfProvider;
      const subaccountSid = document.twilioCredentials.accountId;
      const client = require('twilio')(accountSid, authToken, { accountSid: subaccountSid });

      for (let phoneNumber = 0; phoneNumber < phoneNumbers.length; phoneNumber++) {
        try {
          await client.messages.create({
            from: fromPhoneNumber,
            to: phoneNumbers[phoneNumber].phoneNumberFormatted,
            body: messageBody
          });
          errors.push({ ...phoneNumbers[phoneNumber], state: "success" });
        } catch (error) {
          errors.push({ ...phoneNumbers[phoneNumber], state: "failed", networkError: error });
          console.error('SERVER.JS Catch Error', error);
        };
      };

      // Created.
      const csvStructure = {
        fields: ['phone_number', 'status'],
        data: [
          ...errors.map((phoneNumber) => [phoneNumber.phoneNumberFormatted, phoneNumber.state])
        ]
      };
      const csv = Papa.unparse(csvStructure);
      const fileName = `contact-${uuidv4()}.csv`;
      fs.appendFileSync(`${__dirname}/${fileName}`, csv);

      // Referencing.
      const pathToAttachment = `${__dirname}/${fileName}`;
      const attachment = fs.readFileSync(pathToAttachment).toString("base64");
      
      // Sending Email.
      await sendEmailWithAttachment(attachment, nameOfProvider);

      // Clean up.
      fs.unlinkSync(`${__dirname}/${fileName}`);

    } catch (error) {
      console.log('Serverside Error: ', error);
      sendEmail(providerNameForError);
    };
  });

  server.all('*', (request, response) => {
    return handle(request, response);
  });

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  });
});