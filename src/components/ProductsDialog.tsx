import { useMemo, useState } from 'react';
import productRegistry from '../../reference/legacy-r3/product-registry.json';
import type { MapScene } from '../types/domain';
import { FloatingWindow } from './FloatingWindow';

interface ProductDefinition {
  id: string;
  name: string;
  legend?: string;
  description?: string;
  kind?: string;
}

interface ProductsDialogProps {
  scene: MapScene;
  onSelect: (category: string, product: ProductDefinition) => void;
  onClose: () => void;
}

export function ProductsDialog({ scene, onSelect, onClose }: ProductsDialogProps) {
  const categories = Object.keys(productRegistry);
  const [category, setCategory] = useState(scene.product.category in productRegistry ? scene.product.category : categories[0]);
  const [query, setQuery] = useState('');
  const products = useMemo(() => {
    const list = (productRegistry as Record<string, ProductDefinition[]>)[category] ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return list;
    return list.filter((product) => `${product.name} ${product.id} ${product.description ?? ''}`.toLowerCase().includes(normalized));
  }, [category, query]);

  return (
    <FloatingWindow title="Products" eyebrow="WEATHER DATA" className="product-window" onClose={onClose} initialPosition={{ x: 390, y: 92 }}>
      <div className="product-browser">
        <nav className="product-categories" aria-label="Product categories">
          {categories.map((item) => (
            <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>
              {item.replace(/(^|-)\w/g, (value) => value.replace('-', ' ').toUpperCase())}
            </button>
          ))}
        </nav>
        <section className="product-list-panel">
          <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search products…" />
          <div className="product-list">
            {products.map((product) => (
              <button
                type="button"
                key={product.id}
                className={scene.product.id === product.id ? 'active' : ''}
                onClick={() => onSelect(category, product)}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.description ?? product.kind ?? product.id}</small>
                </span>
                <em>{product.legend ?? 'product'}</em>
              </button>
            ))}
          </div>
        </section>
      </div>
    </FloatingWindow>
  );
}
