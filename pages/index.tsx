import { useState } from 'react';
import { ButtonPrimary } from '../components/button';
import { Label, LabelDescription } from '../components/label';
import { ListSimple } from '../components/list';
import { AddPhoneNumberForm, TextMessage } from '../components/section';
import { v4 as uuid } from 'uuid';
import fetch from 'isomorphic-fetch';
import Image from 'next/image';
import { setTimeout } from 'timers';
import MediaUpload from '../utils/mediaUpload';
import { HeaderPrimary } from '../components/header';
import { OverlaySigningOut } from '../components/overlay';
import { Auth } from 'aws-amplify';

export interface HomeState {
  id: string;
  phoneNumber: string;
  phoneNumberFormatted: string;
  state: string;
};

export const sanitizePhoneText = (text: string): string => {
  const regex: RegExp = /[0-9]/g;

  const newValue: string[] = text.split('');
  const removeSpacesValue: string[] = newValue.filter(letter => letter.match(regex));
  const joinedText: string = removeSpacesValue.join('');

  if (joinedText.length > 8) return `(${joinedText.substring(0, 3)})-${joinedText.substring(3, 6)}-${joinedText.substring(6, 12)}`;

  if (joinedText.length > 5) return `(${joinedText.substring(0, 3)})-${joinedText.substring(3, 6)}`;

  return joinedText.substring(0, 3);
};

export default function Home() {
  // Global state
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  const [phoneNumbers, setPhoneNumbers] = useState<HomeState[]>([]);
  const [textMessage, setTextMessage] = useState<string>();
  const [isSyncing, setSyncing] = useState<boolean>(false);
  const [isUploadingPhoneNumbers, setIsUploadingPhoneNumbers] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitting] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);

  const toggleIsSigningOut = (): void => {
    setIsSigningOut(prevState => !prevState);
  };


  const updateFile = (file: File): void => {
    setFile(file);
    addPhoneNumberBulk(file);
  };

  const removeFile = (): void => {
    setFile(null);
  };

  const clearRows = (): void => {
    setPhoneNumbers([]);
  };

  const toggleIsUploadingPhoneNumbers = (): void => {
    setIsUploadingPhoneNumbers(prevState => !prevState);
  };

  const addPhoneNumber = (phoneNumber: string): void => {
    // Check if item exists
    if(phoneNumber === "") return alert('Please enter a valid phone number.');
    
    // Check if item is already in the list
    const response = phoneNumbers.find(phoneNumberItem => phoneNumberItem.phoneNumber === phoneNumber);
    if(response) return alert('This phone number has already been added to the list');

    // Convert pretty formatted number to E.136 format
    let formattedNumber = sanitizePhoneText(phoneNumber);

    const newPhoneNumber = { 
      id: uuid(), 
      phoneNumber: phoneNumber, 
      phoneNumberFormatted: formattedNumber, 
      state: "none" 
    };
    setPhoneNumbers(prevState => [newPhoneNumber, ...prevState]);
  };

  const addPhoneNumberBulk = (file: any): void => {
    const csvPhoneNumbers: any = [];
    toggleIsUploadingPhoneNumbers();

    MediaUpload().parseCSV(file, (results: any) => {
      console.log('All done!', csvPhoneNumbers);
      setPhoneNumbers(csvPhoneNumbers);
      setTimeout(() => {
        toggleIsUploadingPhoneNumbers();
      }, 5000);
    }, (results: any) => {
      if (results.data[0] === 'phone_numbers' || !results.data[0]) return;
      const phoneNumber = results.data[0];

      let formattedNumber = sanitizePhoneText(phoneNumber);
      formattedNumber = formattedNumber;

      const newPhoneNumber = {
        id: uuid(),
        phoneNumber: phoneNumber,
        phoneNumberFormatted: formattedNumber,
        state: "none"
      };

      csvPhoneNumbers.push(newPhoneNumber);
    });
  };

  const deletePhoneNumber = (id: string) => {
    const newPhoneNumbers = phoneNumbers.filter(phoneNumber => phoneNumber.id !== id);
    setPhoneNumbers(newPhoneNumbers);
  };

  const sendMessagesOnSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      const currentUser = await Auth.currentUserInfo();

      console.log(currentUser);

      const response = await fetch('http://localhost:3000/api/twilio',{
        method: 'POST',
        body: JSON.stringify({ 
          phoneNumbers: phoneNumbers, 
          message: textMessage, 
          username: currentUser.attributes['custom:friendly_username'],
          emailAddress: currentUser.attributes['email'],
          fromPhoneNumber: currentUser.attributes['custom:twilio_phone_number']
        }),
        headers: {
          'Content-Type': 'application/json'
        },
      });
      const json = await response.json();

      console.log('sendMessagesOnSubmit response: ', json);

      const failedPhoneNumbers = json.phoneNumbersFailed;
      let newData: any = []
      failedPhoneNumbers.forEach((phoneNumber: any, index: number): void => {
        console.log(phoneNumber);
        phoneNumber.id === phoneNumbers[index].id ? newData.push({  ...phoneNumber  }) : null
      });

      setPhoneNumbers(newData);
      setIsSubmitting(false);
    } catch (error) {
      console.error(error)
    };
  };

  return (
    <>
      {!isSigningOut ? null : < OverlaySigningOut />}
      <HeaderPrimary toggleIsSigningOut={toggleIsSigningOut} />
      <div className="p-4 sm:p-0 container mx-auto h-full flex flex-wrap justify-center content-center">
        <div className="w-full lg pb-0 shadow-md rounded-md" style={{ maxWidth: 512 }}>
          {/* Header With Logo */}
          <div className="px-4 py-5 bg-violet space-y-6 sm:p-6 justify-center flex rounded-t-lg">
            <Image
              src="/logo-joymd.png"
              alt="Picture of the author"
              width={134}
              height={60}
            />
          </div>
          <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
            <ListSimple rows={phoneNumbers} deletePhoneNumber={deletePhoneNumber} isUploadingPhoneNumbers={isUploadingPhoneNumbers} />
            <div>
              <Label text="Phone Number" htmlFor="phone" />
              <LabelDescription description="A customers 10-digit cellular number. International phone numbers are not supported at this time." />
              <AddPhoneNumberForm
                addPhoneNumber={addPhoneNumber}
                addPhoneNumberBulk={addPhoneNumberBulk}
                updateFile={updateFile}
                removeFile={removeFile}
                clearRows={clearRows}
                isSubmitted={isSubmitted}
                file={file}
                toggleIsUploadingPhoneNumbers={toggleIsUploadingPhoneNumbers}
              />
              <Label text="Message" htmlFor="text_message" />
              <LabelDescription description="Write a message that every customer on your list will recieve." />
              <TextMessage name="text_message" setTextMessage={setTextMessage} isSyncing={isSyncing} setSyncing={setSyncing} />
            </div>
          </div>
          {/* Footer With Button */}
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <ButtonPrimary onClick={sendMessagesOnSubmit} label="Send Text" disabled={phoneNumbers.length === 0 || isSyncing || !textMessage || isSubmitted} />
          </div>
        </div>
      </div>
    </>
  )
};