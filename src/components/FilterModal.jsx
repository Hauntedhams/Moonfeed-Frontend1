import React, { useState } from 'react';
import './FilterModal.css';

function FilterModal({ visible, onClose, onApply, initialFilters }) {
  const [type, setType] = useState(initialFilters.type || 'new');
  const [marketCapMin, setMarketCapMin] = useState(initialFilters.marketCapMin || '');
  const [marketCapMax, setMarketCapMax] = useState(initialFilters.marketCapMax || '');
  const [volumeMin, setVolumeMin] = useState(initialFilters.volumeMin || '');
  const [volumeMax, setVolumeMax] = useState(initialFilters.volumeMax || '');
  const [liquidityMin, setLiquidityMin] = useState(initialFilters.liquidityMin || '');
  const [liquidityMax, setLiquidityMax] = useState(initialFilters.liquidityMax || '');

  if (!visible) return null;

  const handleApply = () => {
    onApply({
      type,
      marketCapMin: marketCapMin ? Number(marketCapMin) : undefined,
      marketCapMax: marketCapMax ? Number(marketCapMax) : undefined,
      volumeMin: volumeMin ? Number(volumeMin) : undefined,
      volumeMax: volumeMax ? Number(volumeMax) : undefined,
      liquidityMin: liquidityMin ? Number(liquidityMin) : undefined,
      liquidityMax: liquidityMax ? Number(liquidityMax) : undefined,
    });
    onClose();
  };

  return (
    <div className="filter-modal-backdrop" onClick={onClose}>
      <div className="filter-modal-window" onClick={e => e.stopPropagation()}>
        <h2>Filter Coins</h2>
        <div className="filter-section">
          <label>Type:</label>
          <div className="filter-type-options">
            <button className={type==='new' ? 'active' : ''} onClick={()=>setType('new')}>New</button>
            <button className={type==='graduating' ? 'active' : ''} onClick={()=>setType('graduating')}>Graduating</button>
            <button className={type==='trending' ? 'active' : ''} onClick={()=>setType('trending')}>Trending</button>
          </div>
        </div>
        <div className="filter-section">
          <label>Market Cap ($):</label>
          <input type="number" placeholder="Min" value={marketCapMin} onChange={e=>setMarketCapMin(e.target.value)} />
          <input type="number" placeholder="Max" value={marketCapMax} onChange={e=>setMarketCapMax(e.target.value)} />
        </div>
        <div className="filter-section">
          <label>Volume ($):</label>
          <input type="number" placeholder="Min" value={volumeMin} onChange={e=>setVolumeMin(e.target.value)} />
          <input type="number" placeholder="Max" value={volumeMax} onChange={e=>setVolumeMax(e.target.value)} />
        </div>
        <div className="filter-section">
          <label>Liquidity ($):</label>
          <input type="number" placeholder="Min" value={liquidityMin} onChange={e=>setLiquidityMin(e.target.value)} />
          <input type="number" placeholder="Max" value={liquidityMax} onChange={e=>setLiquidityMax(e.target.value)} />
        </div>
        <div className="filter-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="apply" onClick={handleApply}>Apply</button>
          <button className="remove-filters" style={{marginLeft:8,background:'#eee',color:'#333',borderRadius:8,padding:'8px 16px',fontWeight:600}} onClick={() => {
            setType('new');
            setMarketCapMin('');
            setMarketCapMax('');
            setVolumeMin('');
            setVolumeMax('');
            setLiquidityMin('');
            setLiquidityMax('');
            onApply({ type: 'new' });
            onClose();
          }}>Remove Filters</button>
        </div>
      </div>
    </div>
  );
}

export default FilterModal;
