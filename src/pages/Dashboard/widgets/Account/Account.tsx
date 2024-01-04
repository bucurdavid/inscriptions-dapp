import axios from 'axios';
import { Label } from 'components/Label';
import { OutputContainer } from 'components/OutputContainer';
import { CopyButton } from 'components/sdkDappComponents';
import { useGetAccountInfo, useGetLoginInfo } from 'hooks';
import { useEffect, useState } from 'react';
import { Username } from './components';

export const Account = () => {
  const { address, account } = useGetAccountInfo();
  const { tokenLogin } = useGetLoginInfo();
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  console.log(import.meta.env.VITE_INDEXER_API);

  const getInscriptions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.REACT_APP_INDEXER_API}/${address}/inscriptions`,
        {
          headers: {
            Authorization: `Bearer ${tokenLogin?.nativeAuthToken}`
          }
        }
      );
      console.log(response.data);
      setInscriptions(response.data);
      sessionStorage.removeItem('inscription');
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
    }
  };

  useEffect(() => {
    const checkIfProcessed = async () => {
      const inscriptionStatus = sessionStorage.getItem('inscription');
      if (inscriptionStatus === 'processed') {
        getInscriptions();
      }
    };

    // Initial check
    getInscriptions();
    checkIfProcessed();

    // Set up an interval to check every 1000 milliseconds (1 second)
    const intervalId = setInterval(() => {
      checkIfProcessed();
    }, 1000);

    // Cleanup: clear the interval when the component is unmounted
    return () => {
      clearInterval(intervalId);
      sessionStorage.removeItem('inscription');
    };
  }, []);

  return (
    <>
      <OutputContainer>
        <div className='flex flex-col text-black' data-testid='topInfo'>
          <p className='truncate'>
            <Label>Address: </Label>
            <span data-testid='accountAddress'> {address}</span>
          </p>

          <Username account={account} />
        </div>
      </OutputContainer>
      <div className='mt-5 grid grid-cols-2 gap-4'>
        {inscriptions.map((inscription) => (
          <div className='max-w-sm rounded overflow-hidden shadow-lg m-2'>
            <div className='px-6 py-2'>
              <div className='font-bold text-xl mb-2'>Inscription</div>
              <Label>
                Hash:
                <p className='text-gray-700 text-xs break-words'>
                  {inscription.hash}
                  <CopyButton className='ml-2' text={inscription.hash} />
                </p>
              </Label>
              <Label>
                Tx Hash:
                <p className='text-gray-700 text-xs break-words hover:underline'>
                  {inscription.txHash}
                  <CopyButton className='ml-2' text={inscription.txHash} />
                </p>
              </Label>
              <Label>
                Creator:
                <p className='text-gray-700 text-xs break-words'>
                  {inscription.creator}
                  <CopyButton className='ml-2' text={inscription.creator} />
                </p>
              </Label>
              <Label>
                Owner:
                <p className='text-gray-700 text-xs break-words'>
                  {inscription.owner}
                  <CopyButton className='ml-2' text={inscription.owner} />
                </p>
              </Label>
              <Label>
                Signature:
                <p className='text-gray-700 text-xs break-words'>
                  {inscription.signature}
                  <CopyButton className='ml-2' text={inscription.signature} />
                </p>
              </Label>
              <Label>
                Created at:
                <p className='text-gray-700 text-xs break-words'>
                  {new Date(inscription.timestamp * 1000).toLocaleString(
                    'en-GB',
                    {
                      hour12: false,
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      second: 'numeric'
                    }
                  )}
                </p>
              </Label>
              <div className='flex flex-row w-full gap-2 mt-2'>
                <Label>Payload:</Label>
                <textarea
                  readOnly
                  className='w-full resize-none outline-none bg-transparent text-sm'
                  rows={2}
                  value={atob(inscription.payload)}
                />
                <CopyButton className='ml-2' text={atob(inscription.payload)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
