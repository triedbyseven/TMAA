import React, { useState } from 'react';
import { ButtonClearUpload, ButtonExcel, ButtonPrimary } from '../button';

interface AddPhoneNumberFormProps {
  addPhoneNumber: (phoneNumber: string) => void;
  addPhoneNumberBulk: (file: any) => void;
  updateFile: (file: File) => void;
  removeFile: () => void;
  clearRows: () => void;
  toggleIsUploadingPhoneNumbers: () => void;
  isSubmitted: boolean;
  file: File | null;
}

const AddPhoneNumberForm: React.FC<AddPhoneNumberFormProps> = (props): React.ReactElement => {
  const { addPhoneNumber, isSubmitted } = props;

  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { target: { value } } = event;
    let phoneNumber: string = value;

    const regex = new RegExp('^[0-9_ \(\)\-]*$');
    if (!regex.test(phoneNumber)) return;

    if (value.length > 14) return;

    if (value.length === 4) {
      var res = value.split("", 4);
      res = ["(", res[0], res[1], res[2], ")", " ", res[3] ]
      console.log(res.join(''));
      phoneNumber = res.join('');
    }
    
    if (value.length === 6) {
      phoneNumber = phoneNumber.slice(1);
      phoneNumber = phoneNumber.slice(0, -1);
      phoneNumber = phoneNumber.slice(0, -1);
    }

    if (value.length === 9 || phoneNumber.length === 9) phoneNumber = phoneNumber + "-";
    if (value.length === 10) phoneNumber = phoneNumber.slice(0, -1);  

    setPhoneNumber(phoneNumber);
  };

  const handleOnSubmit = (): void => {
    addPhoneNumber(phoneNumber);
    setPhoneNumber('');
  };

  const handleOnKeyDown = (e: any): void => {
    console.log(e.keyCode);
    if (e.keyCode === 16 || e.keyCode === 17 || e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40 || e.keyCode === 65) {
      e.preventDefault();
    }
  };

  const handleOnPaste = (e: any): void => {
    e.preventDefault();
  };

  return (
    <>
      <div className="mt-1 mb-2 flex rounded-md shadow-sm">
        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
          +1
        </span>
        <input
          type="text"
          name="phone_number"
          id="phone_number"
          autoComplete="off"
          onPaste={handleOnPaste}
          onKeyDown={handleOnKeyDown}
          value={phoneNumber}
          onChange={handleOnChange}
          className="
            flex-1 
            block 
            w-full 
            rounded-none 
            rounded-r-md 
            sm:text-sm 
            border
            border-gray-300 
            p-2
            focus:outline-none
            focus:ring-2
            focus:ring-violet
            "
          placeholder="(222) 333-4444"
        />
      </div>
      <div className="flex justify-end">
        <ButtonExcel 
          updateFile={props.updateFile} 
          removeFile={props.removeFile} 
          clearRows={props.clearRows} 
          label="Upload CSV" 
          disabled={isSubmitted || props.file ? true : false} 
          disabled2={isSubmitted || !props.file ? true : false} 
        />
        <ButtonPrimary onClick={handleOnSubmit} label="Add Phone Number" disabled={isSubmitted} />
      </div>
    </>
  );
};

export default AddPhoneNumberForm;