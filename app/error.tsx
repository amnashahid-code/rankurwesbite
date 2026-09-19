'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="auth-page"><div className="auth-card"><h1>Something went wrong.</h1><p>Please try again. If this continues, contact support.</p><button className="button primary" onClick={reset}>Try again</button></div></main>;}
