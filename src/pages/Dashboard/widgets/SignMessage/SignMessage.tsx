import { useState } from 'react';
import type { MouseEvent } from 'react';
import {
  faFileSignature,
  faBroom,
  faArrowsRotate
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGetSignMessageSession } from '@multiversx/sdk-dapp/hooks/signMessage/useGetSignMessageSession';
import { Button } from 'components/Button';
import { OutputContainer } from 'components/OutputContainer';
import {
  useGetAccount,
  useGetAccountInfo,
  useGetLastSignedMessageSession,
  useSignMessage
} from 'hooks';
import { SignedMessageStatusesEnum } from 'types';
import { SignFailure, SignSuccess } from './components';
import {
  Address,
  GasEstimator,
  Transaction,
  TransactionPayload
} from '@multiversx/sdk-core/out';
import { getChainId } from 'utils/getChainId';
import { refreshAccount } from '@multiversx/sdk-dapp/utils/account/refreshAccount';
import { sendTransactions } from '@multiversx/sdk-dapp/services/transactions/sendTransactions';
import { SHA256 } from 'crypto-js';

export const SignMessage = () => {
  const { address } = useGetAccountInfo();
  const { sessionId, signMessage, onAbort } = useSignMessage();
  const signedMessageInfo = useGetLastSignedMessageSession();
  const messageSession = useGetSignMessageSession(sessionId);

  const [message, setMessage] = useState('');
  const [objectBase64, setObjectBase64] = useState('');
  const [objectHash, setObjectHash] = useState('');

  const handleSubmit = (e: MouseEvent) => {
    e.preventDefault();

    if (signedMessageInfo) {
      onAbort();
    }

    if (!message.trim()) {
      return;
    }

    // transform to base64
    const objectBase64 = btoa(message);

    // hash the object
    const hash = SHA256(objectBase64).toString();

    setObjectBase64(objectBase64);
    setObjectHash(hash);

    signMessage({
      message: objectBase64,
      callbackRoute: window.location.href
    });

    setMessage('');
  };

  const handleClear = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAbort();
  };

  const isError =
    [
      SignedMessageStatusesEnum.cancelled,
      SignedMessageStatusesEnum.failed
    ].includes(signedMessageInfo?.status) && messageSession?.message;

  const isSuccess =
    messageSession?.message &&
    signedMessageInfo?.status === SignedMessageStatusesEnum.signed;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex gap-2 items-start'>
        {(isSuccess || isError) && (
          <Button
            data-testid='closeTransactionSuccessBtn'
            id='closeButton'
            onClick={handleClear}
          >
            <FontAwesomeIcon
              icon={isSuccess ? faBroom : faArrowsRotate}
              className='mr-1'
            />
            {isError ? 'Try again' : 'Clear'}
          </Button>
        )}
      </div>
      <OutputContainer>
        {!isSuccess && !isError && (
          <textarea
            placeholder={
              'Object to inscribe\n Example: {"name":"John", "age":30, "car":null}'
            }
            className='resize-none rounded-md w-full h-32 focus:outline-none focus:border-blue-500'
            onChange={(event) => setMessage(event.currentTarget.value)}
          />
        )}

        {isSuccess && (
          <>
            <SignSuccess messageToSign={signedMessageInfo?.message ?? ''} />
          </>
        )}

        {isError && <SignFailure />}
      </OutputContainer>

      {!isSuccess ? (
        <>
          <Button
            data-testid='signMsgBtn'
            onClick={handleSubmit}
            disabled={!message}
          >
            <FontAwesomeIcon icon={faFileSignature} className='mr-1' />
            Sign Message
          </Button>
          <p className='text-gray-300 text-xs'>
            You will sign the base64 encoded object
          </p>
        </>
      ) : (
        <Button
          data-testid='inscribeBtn'
          onClick={() =>
            inscribeTransaction(
              address,
              objectBase64,
              objectHash,
              signedMessageInfo?.signature
            )
          }
        >
          Inscribe
        </Button>
      )}
    </div>
  );
};

const inscribeTransaction = async (
  address: string,
  object: string,
  objectHash: string,
  signature: string | undefined
) => {
  if (!signature) {
    return;
  }
  const tx = new Transaction({
    value: 0,
    data: new TransactionPayload(
      `inscribe@${object}@${objectHash}@${signature}`
    ),
    receiver: new Address(address),
    sender: new Address(address),
    gasLimit: new GasEstimator().forEGLDTransfer(object.length) + 5_000_000,
    chainID: getChainId()
  });
  await refreshAccount();
  await sendTransactions({
    transactions: tx,
    transactionsDisplayInfo: {
      processingMessage: 'Inscribing...',
      errorMessage: 'Error occurred inscribing',
      successMessage: 'Inscribed successfully'
    },
    redirectAfterSign: false
  });
};
