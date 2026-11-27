/**
 * U1's basic pages, routed by the address fragment (U18 and U19 replace these pages).
 * #/items · #/items/new · #/items/<id> · #/proposals/<id> · #/signin
 */
import { useEffect, useState } from 'react';
import { authClient } from './api.ts';
import { Decide } from './pages/Decide.tsx';
import { ItemList } from './pages/ItemList.tsx';
import { ItemPage } from './pages/ItemPage.tsx';
import { NewItem } from './pages/NewItem.tsx';
import { SignIn } from './pages/SignIn.tsx';

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return hash;
}

const go = (hash: string) => {
  window.location.hash = hash;
};

export function App() {
  const hash = useHash();
  const session = authClient.useSession();
  if (session.isPending) return <p>Loading…</p>;
  if (!session.data) return <SignIn onSignedIn={() => void session.refetch()} />;

  const [, section, id] = hash.replace(/^#/, '').split('/');
  let page;
  if (section === 'items' && id === 'new') page = <NewItem onCreated={() => go('#/items')} />;
  else if (section === 'items' && id) page = <ItemPage itemId={id} />;
  else if (section === 'proposals' && id)
    page = <Decide proposalId={id} onDecided={() => go('#/items')} />;
  else page = <ItemList />;

  return (
    <main>
      <nav>
        <a href="#/items">Knowledge</a>{' '}
        <button data-testid="signout" type="button" onClick={() => void authClient.signOut()}>
          Sign out
        </button>
      </nav>
      {page}
    </main>
  );
}
