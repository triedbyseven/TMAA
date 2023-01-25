require('dotenv').config();
const express = require('express');
const next = require('next');
const AWS = require('aws-sdk');

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

const getDocument = async (username, email) => {
  try {
    const TableName = process.env.AWS_DYNAMODB ? process.env.AWS_DYNAMODB : '';
    if (!TableName) throw new Error('Table name envrionment variable unavailable');

    const user_details = {
      username: username,
      email: email
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

app.prepare().then(() => {
    const server = express();
    server.use(express.json());
    server.use(express.urlencoded());


    server.post('/api/twilio', async (request, response) => {
      
        
      try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;

          const username = request.body.username;
          const emailAddress = request.body.emailAddress;
          const fromPhoneNumber = request.body.fromPhoneNumber;
          const phoneNumbers = request.body.phoneNumbers;
          const messageBody = request.body.message;

          const document = await getDocument(username, emailAddress);
          const subaccountSid = document.twilioCredentials.accountId;
          
          const client = require('twilio')(accountSid, authToken, { accountSid: subaccountSid });
  
          const errors = []

          for (let phoneNumber = 0; phoneNumber < phoneNumbers.length; phoneNumber++) {
              try {
                  await client.messages.create({
                    from: fromPhoneNumber,
                    to: phoneNumbers[phoneNumber].phoneNumberFormatted,
                    body: messageBody
                  });
                  errors.push({...phoneNumbers[phoneNumber], state: "success"});
              } catch (error) {
                  errors.push({ ...phoneNumbers[phoneNumber], state: "failed"});
                  console.error(error);
              };
          };
  
          response.set('Content-Type', 'application/json');
          response.send(JSON.stringify({ success: true, phoneNumbersFailed: errors }));

        } catch (error) {
          console.log('Serverside Error: ', error);
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