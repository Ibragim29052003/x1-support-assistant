import { FACTS } from '../lib/policy';

export function Knowledge() {
  return (
    <aside className="knowledge" aria-labelledby="knowledge-heading">
      <div className="product-card">
        <span className="eyebrow">В каталоге</span>
        <div className="product-name" aria-hidden="true">
          X1
        </div>
        <p className="product-description">{FACTS.find((fact) => fact.id === 'product')?.text}</p>
      </div>
      <div className="knowledge-heading">
        <h2 id="knowledge-heading">Регламент магазина</h2>
        <span>06 пунктов</span>
      </div>
      <ol className="fact-list">
        {FACTS.map((fact, index) => (
          <li key={fact.id}>
            <span className="fact-number" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <h3>{fact.title}</h3>
              <p>{fact.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="knowledge-note">Если информации здесь нет, ассистент сообщит об этом.</p>
    </aside>
  );
}
