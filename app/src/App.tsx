import { IOSDevice } from './ios/IOSDevice';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { useAuth } from './auth/context';
import { usePafa } from './state/usePafa';
import { DEFAULT_ECONOMICS } from './domain/types';
import { C } from './theme';
import { Home } from './screens/Home';
import { Stocks } from './screens/Stocks';
import { Pay, Review } from './screens/Pay';
import { Earned } from './screens/Earned';
import { Brand, Redeem, Redeemed } from './screens/Brand';
import { Vesting } from './screens/Vesting';
import { Benefits } from './screens/Benefits';
import { Activity, CardScreen } from './screens/Card';
import { TxDetail } from './screens/TxDetail';
import { Login } from './screens/Login';

export default function App() {
  const { authenticated, ready } = useAuth();
  const pafa = usePafa(DEFAULT_ECONOMICS);

  return (
    <div className="pafa-stage">
      <IOSDevice dark>
        {!ready || !authenticated ? <Login /> : <Shell pafa={pafa} />}
      </IOSDevice>
    </div>
  );
}

function Shell({ pafa }: { pafa: ReturnType<typeof usePafa> }) {
  const { vm, actions, pull, scrollRef } = pafa;
  const { displayName } = useAuth();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.bg,
        overflow: 'hidden',
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}
    >
      {/* ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: -140,
          left: -60,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(153,69,255,.28),transparent 68%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
          animation: 'pafaGlow 9s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -90,
          right: -110,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(20,241,149,.16),transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <Header
        title={vm.title}
        canBack={vm.canBack}
        showAvatar={vm.showAvatar}
        displayName={displayName}
        onBack={actions.back}
        onProfile={() => actions.go('card', { reset: true })}
      />

      <div
        ref={scrollRef}
        onPointerDown={pull.onPullStart}
        onPointerMove={pull.onPullMove}
        onPointerUp={pull.onPullEnd}
        onPointerCancel={pull.onPullEnd}
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '112px 18px 132px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            transform: `translateY(${pull.pullY}px)`,
            transition: pull.pulling ? 'none' : 'transform 340ms cubic-bezier(.2,.8,.2,1)',
          }}
        >
          {pull.spinning ? (
            <div style={{ height: 0, display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  marginTop: -34,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid rgba(153,69,255,.25)',
                  borderTopColor: C.mint,
                  animation: 'pafaSpin .7s linear infinite',
                }}
              />
            </div>
          ) : null}

          <ScreenSwitch pafa={pafa} />
        </div>
      </div>

      <TabBar screen={vm.screen} onNavigate={(s) => actions.go(s, { reset: true })} />
    </div>
  );
}

function ScreenSwitch({ pafa }: { pafa: ReturnType<typeof usePafa> }) {
  const props = { vm: pafa.vm, actions: pafa.actions };

  switch (pafa.vm.screen) {
    case 'home':
      return <Home {...props} />;
    case 'stocks':
      return <Stocks {...props} />;
    case 'pay':
      return <Pay {...props} />;
    case 'review':
      return <Review {...props} />;
    case 'earned':
      return <Earned {...props} />;
    case 'brand':
      return <Brand {...props} />;
    case 'redeem':
      return <Redeem {...props} />;
    case 'redeemed':
      return <Redeemed {...props} />;
    case 'vesting':
      return <Vesting {...props} />;
    case 'benefits':
      return <Benefits {...props} />;
    case 'card':
      return <CardScreen {...props} />;
    case 'activity':
      return <Activity {...props} />;
    case 'tx':
      return <TxDetail {...props} />;
  }
}
