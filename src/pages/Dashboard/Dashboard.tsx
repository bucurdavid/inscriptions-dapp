import { Card } from 'components/Card';
import { AuthRedirectWrapper } from 'wrappers';
import { Account, SignMessage } from './widgets';

type WidgetsType = {
  title: string;
  widget: (props: any) => JSX.Element;
  description?: string;
  props?: { receiver?: string };
  reference?: string;
};

const WIDGETS: WidgetsType[] = [
  {
    title: 'Account Inscriptions',
    widget: Account
  },
  {
    title: 'Inscriptions',
    widget: SignMessage,
    description: 'Store custom objects on the blockchain',
    reference: 'https://twitter.com/SasuRobert/status/1738173405981983018'
  }
];

export const Dashboard = () => (
  <AuthRedirectWrapper>
    <div className='flex flex-col gap-6 max-w-3xl w-full'>
      {WIDGETS.map((element) => {
        const {
          title,
          widget: MxWidget,
          description,
          props = {},
          reference
        } = element;

        return (
          <Card
            key={title}
            title={title}
            description={description}
            reference={reference}
          >
            <MxWidget {...props} />
          </Card>
        );
      })}
    </div>
  </AuthRedirectWrapper>
);
