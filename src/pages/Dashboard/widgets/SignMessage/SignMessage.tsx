import {
  faArrowsRotate,
  faBroom,
  faFileSignature
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Address,
  GasEstimator,
  Transaction,
  TransactionPayload
} from '@multiversx/sdk-core/out';
import { useGetSignMessageSession } from '@multiversx/sdk-dapp/hooks/signMessage/useGetSignMessageSession';
import { sendTransactions } from '@multiversx/sdk-dapp/services/transactions/sendTransactions';
import { refreshAccount } from '@multiversx/sdk-dapp/utils/account/refreshAccount';
import axios from 'axios';
import { Button } from 'components/Button';
import { OutputContainer } from 'components/OutputContainer';
import {
  useGetAccountInfo,
  useGetLastSignedMessageSession,
  useGetLoginInfo,
  useGetPendingTransactions,
  useSignMessage,
  useTrackTransactionStatus
} from 'hooks';
import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { SignedMessageStatusesEnum } from 'types';
import { getChainId } from 'utils/getChainId';
import { SignFailure, SignSuccess } from './components';
import toast from 'react-hot-toast';
import { deleteTransactionToast } from '@multiversx/sdk-dapp/services/transactions/clearTransactions';

export const SignMessage = () => {
  const { address } = useGetAccountInfo();
  const { tokenLogin, loginMethod } = useGetLoginInfo();
  const { sessionId, signMessage, onAbort } = useSignMessage();
  const signedMessageInfo = useGetLastSignedMessageSession();
  const messageSession = useGetSignMessageSession(sessionId);

  const [message, setMessage] = useState('');
  const [objectBase64, setObjectBase64] = useState('');
  const [objectHash, setObjectHash] = useState('');
  const [inscribeSession, setInscribeSession] = useState('');
  const [inscribeTxHash, setInscribeTxHash] = useState<string>('');
  const [inscribeTxStatus, setInscribeTxStatus] = useState(false);

  const isWebWallet = loginMethod === 'wallet';

  const inscribeSessionId = useTrackTransactionStatus({
    transactionId: inscribeSession
  });

  const { pendingTransactions } = useGetPendingTransactions();

  useEffect(() => {
    if (!pendingTransactions[inscribeSession]) return;
    const transactionHash =
      pendingTransactions[inscribeSession].transactions[0].hash;
    console.log(transactionHash);
    setInscribeTxHash(transactionHash);
  }, [pendingTransactions]);

  useEffect(() => {
    setInscribeTxStatus(inscribeSessionId.isSuccessful ? true : false);
  }, [inscribeSessionId]);

  useEffect(() => {
    if (inscribeTxStatus && !isWebWallet) {
      sendProcess();
    }
  }, [inscribeTxStatus]);

  const handleSubmit = async (e: MouseEvent) => {
    e.preventDefault();

    if (signedMessageInfo) {
      onAbort();
    }

    if (!message.trim()) {
      return;
    }

    // transform to base64
    const objectBase64 = btoa(message);

    // send a post request with the payload
    try {
      const response = await axios.post(
        `https://inscriptions-indexer-bucurdavid.koyeb.app/generate`,
        { payload: objectBase64 },
        {
          headers: {
            Authorization: `Bearer ${tokenLogin?.nativeAuthToken}`
          }
        }
      );

      setObjectHash(response.data);

      setObjectBase64(objectBase64);

      signMessage({
        message: objectBase64,
        callbackRoute: window.location.href
      });

      setMessage('');
    } catch (e: any) {
      // Check if the error has a response with data property
      if (e.response && e.response.data) {
        toast.error(
          `Error generating inscription hash: ${e.response.data.message}`
        );
      } else {
        toast.error('Error generating hash for inscription');
      }
    }
  };

  const sendProcess = async () => {
    const response = await axios.post(
      `https://inscriptions-indexer-bucurdavid.koyeb.app/process`,
      { txHash: inscribeTxHash },
      {
        headers: {
          Authorization: `Bearer ${tokenLogin?.nativeAuthToken}`
        }
      }
    );

    if (response.data) {
      console.log('Inscription processed');
      sessionStorage.setItem('inscription', 'processed');
    }
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
          onClick={async () => {
            const sessionId = await inscribeTransaction(
              address,
              objectBase64,
              objectHash,
              signedMessageInfo?.signature
            );

            setInscribeSession(sessionId);
          }}
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
  const { sessionId } = await sendTransactions({
    transactions: tx,
    transactionsDisplayInfo: {
      processingMessage: 'Inscribing...',
      errorMessage: 'Error occurred inscribing',
      successMessage: 'Inscribed successfully'
    },
    redirectAfterSign: false
  });

  return sessionId;
};
