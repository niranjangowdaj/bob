import { useState } from 'react'

export default function App() {
  const [active, setActive] = useState(false)

  return (
    <div style={{"minHeight":"100vh","padding":"2rem","maxWidth":"900px","margin":"0 auto"}}>
      <header style={{"textAlign":"center","marginBottom":"3rem"}}>
        <h1 style={{"fontSize":"2.5rem","fontWeight":700}}>
          <span style={{"color":"#4ade80"}}>Syntax</span>
           Swap Playground
        </h1>
        <p style={{"color":"#888","marginTop":"0.5rem"}}>An interactive educational tool that lets developers paste code in one programming language and instantly see the equivalent logic translated into another side-by-side.</p>
      </header>
      <main>
<section style="background:var(--surface);border-radius:12px;padding:2rem">
  <h2 style="font-size:1.5rem;margin-bottom:1rem;color:#4ade80">Syntax Swap Playground</h2>
  <p style="color:var(--text-dim);line-height:1.6">An interactive educational tool that lets developers paste code in one programming language and instantly see the equivalent logic translated into another side-by-side.</p>
</section>


      </main>
      <footer style={{"textAlign":"center","marginTop":"3rem","color":"#555","fontSize":"0.85rem"}}>
        Built by Bob
      </footer>
    </div>
  )
}
