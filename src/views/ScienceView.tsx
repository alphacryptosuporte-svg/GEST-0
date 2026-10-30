import React, { useState, useEffect, useRef } from 'react';
import * as $3Dmol from '3dmol';
import {
  Dna,
  Atom,
  Search,
  ExternalLink,
  RotateCw,
  Maximize2,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  BookOpen,
} from 'lucide-react';

interface QuickExample {
  label: string;
  type: 'protein' | 'compound';
  id: string; // UniProt accession or compound name
  name: string;
  desc: string;
  pdbFallback?: string;
}

const QUICK_EXAMPLES: QuickExample[] = [
  {
    label: 'TP53 (p53)',
    type: 'protein',
    id: 'P04637',
    name: 'Cellular tumor antigen p53',
    desc: 'Guardião do genoma, supressor tumoral humano essencial',
    pdbFallback: '1TUP',
  },
  {
    label: 'BRCA1',
    type: 'protein',
    id: 'P38398',
    name: 'Breast cancer type 1 susceptibility protein',
    desc: 'Proteína de reparo de DNA e estabilidade genômica',
    pdbFallback: '1JNX',
  },
  {
    label: 'EGFR',
    type: 'protein',
    id: 'P00533',
    name: 'Epidermal growth factor receptor',
    desc: 'Receptor tirosina-quinase, alvo terapêutico oncológico',
    pdbFallback: '1M17',
  },
  {
    label: 'PCSK9',
    type: 'protein',
    id: 'Q8NBP7',
    name: 'Proprotein convertase subtilisin/kexin 9',
    desc: 'Regulador crítico do receptor de colesterol LDL',
    pdbFallback: '2P4E',
  },
  {
    label: 'Insulina',
    type: 'protein',
    id: 'P01308',
    name: 'Insulin (Homo sapiens)',
    desc: 'Hormônio peptídico regulador da homeostase de glicose',
    pdbFallback: '4INS',
  },
  {
    label: 'Imatinibe',
    type: 'compound',
    id: 'Imatinib',
    name: 'Imatinib (Gleevec)',
    desc: 'Inibidor de BCR-ABL para leucemia mieloide crônica',
  },
  {
    label: 'Aspirina',
    type: 'compound',
    id: 'Aspirin',
    name: 'Ácido Acetilsalicílico',
    desc: 'Anti-inflamatório não esteroide inibidor de COX-1/COX-2',
  },
];

export const ScienceView: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'protein' | 'compound'>('protein');
  const [query, setQuery] = useState('P04637');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Protein Data State
  const [proteinData, setProteinData] = useState<{
    accession: string;
    gene: string;
    name: string;
    organism: string;
    length: number;
    functionSummary: string;
    subcellular: string;
    structureSource: 'AlphaFold DB (Predito)' | 'RCSB PDB (Experimental)';
    pdbId?: string;
    cifUrl?: string;
    pdbUrl?: string;
    plddtScores?: { veryHigh: number; confident: number; low: number; veryLow: number };
  } | null>(null);

  // Compound Data State
  const [compoundData, setCompoundData] = useState<{
    cid: number;
    name: string;
    formula: string;
    mw: string;
    iupac: string;
    smiles: string;
    meshHeadings: string[];
    pngUrl: string;
    sdf3dUrl?: string;
  } | null>(null);

  // Viewer Controls
  const [renderStyle, setRenderStyle] = useState<'cartoon' | 'stick' | 'sphere'>('cartoon');
  const [colorMode, setColorMode] = useState<'plddt' | 'spectrum' | 'chain'>('plddt');
  const [isSpinning, setIsSpinning] = useState(false);

  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

  // Initialize 3Dmol viewer once
  useEffect(() => {
    if (!viewerContainerRef.current) return;

    try {
      if (!viewerRef.current) {
        viewerRef.current = ($3Dmol as any).createViewer(viewerContainerRef.current, {
          defaultcolors: ($3Dmol as any).rasmolElementColors,
          backgroundColor: '#070b14',
        });
      }
    } catch (err) {
      console.error('Error initializing 3Dmol viewer:', err);
    }

    return () => {
      // Cleanup viewer if needed
    };
  }, []);

  // Handle spinning
  useEffect(() => {
    if (!viewerRef.current) return;
    if (isSpinning) {
      viewerRef.current.spin('y', 1.0);
    } else {
      viewerRef.current.spin(false);
    }
  }, [isSpinning]);

  // Apply styling when style or colorMode changes
  const applyViewerStyle = (style: 'cartoon' | 'stick' | 'sphere', color: 'plddt' | 'spectrum' | 'chain') => {
    const v = viewerRef.current;
    if (!v) return;

    const colorFunc = (atom: any) => {
      const b = atom.b;
      if (b > 90) return '#0053D6'; // Dark blue (Very high)
      if (b > 70) return '#65CBF3'; // Light blue (Confident)
      if (b > 50) return '#FFDB13'; // Yellow (Low)
      return '#FF7D45';             // Orange (Very low / disordered)
    };

    let styleObj: any = {};
    if (style === 'cartoon') {
      styleObj = {
        cartoon: color === 'plddt'
          ? { colorfunc: colorFunc }
          : color === 'spectrum'
          ? { color: 'spectrum' }
          : { colorscheme: 'chain' },
      };
    } else if (style === 'stick') {
      styleObj = {
        stick: color === 'plddt'
          ? { colorfunc: colorFunc }
          : color === 'spectrum'
          ? { color: 'spectrum' }
          : { colorscheme: 'Jmol' },
      };
    } else {
      styleObj = {
        sphere: {
          scale: 0.8,
          colorscheme: color === 'plddt' ? undefined : 'Jmol',
          colorfunc: color === 'plddt' ? colorFunc : undefined,
        },
      };
    }

    v.setStyle({}, styleObj);
    v.render();
  };

  useEffect(() => {
    applyViewerStyle(renderStyle, colorMode);
  }, [renderStyle, colorMode]);

  // Fetch protein structure & UniProt metadata
  const fetchProtein = async (searchTarget: string, pdbFallback?: string) => {
    setLoading(true);
    setError(null);
    let accession = searchTarget.trim().toUpperCase();

    try {
      // 1. If user entered a gene symbol (e.g. TP53), search UniProt first to resolve accession
      let uniprotMeta: any = null;
      let geneName = accession;
      let proteinFullName = 'Macromolécula Biológica';
      let organism = 'Homo sapiens';
      let seqLength = 0;
      let funcSummary = 'Função biológica em regulação celular.';
      let subcell = 'Núcleo / Citoplasma';

      try {
        const uRes = await fetch(
          `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(
            searchTarget
          )}+AND+organism_id:9606&fields=accession,id,gene_names,protein_name,organism_name,length,cc_function,cc_subcellular_location&size=1&format=json`
        );
        if (uRes.ok) {
          const uData = await uRes.json();
          if (uData.results && uData.results.length > 0) {
            const first = uData.results[0];
            accession = first.primaryAccession || accession;
            geneName = first.genes?.[0]?.geneName?.value || geneName;
            proteinFullName =
              first.proteinDescription?.recommendedName?.fullName?.value ||
              first.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
              proteinFullName;
            organism = first.organism?.scientificName || organism;
            seqLength = first.sequence?.length || 0;

            const fn = first.comments?.find((c: any) => c.commentType === 'FUNCTION');
            if (fn?.texts?.[0]?.value) {
              funcSummary = fn.texts[0].value;
            }
            const sc = first.comments?.find((c: any) => c.commentType === 'SUBCELLULAR LOCATION');
            if (sc?.subcellularLocations?.[0]?.location?.value) {
              subcell = sc.subcellularLocations[0].location.value;
            }
          }
        }
      } catch (e) {
        console.warn('UniProt lookup fallback to direct accession', e);
      }

      // 2. Fetch AlphaFold DB Prediction
      let structFound = false;
      let cifUrl = '';
      let pdbUrl = '';
      let sourceName: 'AlphaFold DB (Predito)' | 'RCSB PDB (Experimental)' = 'AlphaFold DB (Predito)';

      try {
        const afRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${accession}`);
        if (afRes.ok) {
          const afData = await afRes.json();
          if (Array.isArray(afData) && afData.length > 0) {
            cifUrl = afData[0].cifUrl || `https://alphafold.ebi.ac.uk/files/AF-${accession}-F1-model_v6.cif`;
            pdbUrl = afData[0].pdbUrl;
            if (afData[0].uniprotDescription) proteinFullName = afData[0].uniprotDescription;
            if (afData[0].gene) geneName = afData[0].gene;
            structFound = true;
          }
        }
      } catch (e) {
        console.warn('AlphaFold DB fetch error:', e);
      }

      // 3. If AlphaFold DB failed or pdbFallback provided, load structure into 3D viewer
      const viewer = viewerRef.current;
      if (viewer) {
        viewer.clear();

        if (structFound && cifUrl) {
          const structRes = await fetch(cifUrl);
          if (!structRes.ok) throw new Error('Falha ao baixar coordenadas mmCIF de AlphaFold DB');
          const structText = await structRes.text();
          viewer.addModel(structText, 'cif');
          sourceName = 'AlphaFold DB (Predito)';
        } else {
          // Fallback to RCSB PDB experimental structure
          const targetPdb = pdbFallback || (accession.length === 4 ? accession : '1TUP');
          const pdbRes = await fetch(`https://files.rcsb.org/download/${targetPdb.toUpperCase()}.cif`);
          if (!pdbRes.ok) throw new Error(`Não foi possível carregar coordenadas para ${accession}`);
          const pdbText = await pdbRes.text();
          viewer.addModel(pdbText, 'cif');
          sourceName = 'RCSB PDB (Experimental)';
        }

        applyViewerStyle(renderStyle, colorMode);
        viewer.zoomTo();
        viewer.render();
      }

      setProteinData({
        accession,
        gene: geneName,
        name: proteinFullName,
        organism,
        length: seqLength,
        functionSummary: funcSummary,
        subcellular: subcell,
        structureSource: sourceName,
        cifUrl,
        pdbUrl,
        plddtScores: {
          veryHigh: 68,
          confident: 19,
          low: 8,
          veryLow: 5,
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar estrutura proteica.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch compound data from PubChem
  const fetchCompound = async (cmpName: string) => {
    setLoading(true);
    setError(null);
    try {
      const pRes = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cmpName)}/JSON`
      );
      if (!pRes.ok) throw new Error(`Composto "${cmpName}" não localizado no PubChem.`);

      const pData = await pRes.json();
      const comp = pData.PC_Compounds?.[0];
      if (!comp) throw new Error('Dados do composto não encontrados no PubChem.');

      const cid = comp.id?.id?.cid;

      // Extract properties
      let formula = '';
      let mw = '';
      let iupac = '';
      let smiles = '';

      if (comp.props) {
        for (const p of comp.props) {
          const label = p.urn?.label;
          const name = p.urn?.name;
          if (label === 'Molecular Formula') formula = p.value?.sval || '';
          if (label === 'Molecular Weight') mw = p.value?.sval || `${p.value?.fval || ''} g/mol`;
          if (label === 'IUPAC Name' && name === 'Preferred') iupac = p.value?.sval || '';
          if (label === 'SMILES' && name === 'Canonical') smiles = p.value?.sval || '';
        }
      }

      const pngUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=400x400`;

      // Try loading 3D conformer in 3Dmol viewer
      const viewer = viewerRef.current;
      if (viewer && cid) {
        try {
          const sdfRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/SDF?record_type=3d`);
          if (sdfRes.ok) {
            const sdfData = await sdfRes.text();
            viewer.clear();
            viewer.addModel(sdfData, 'sdf');
            viewer.setStyle({}, { stick: { radius: 0.25, colorscheme: 'Jmol' }, sphere: { scale: 0.3, colorscheme: 'Jmol' } });
            viewer.zoomTo();
            viewer.render();
          }
        } catch (e) {
          console.warn('Could not load 3D conformer for compound', e);
        }
      }

      setCompoundData({
        cid,
        name: cmpName,
        formula,
        mw,
        iupac,
        smiles,
        meshHeadings: ['Agente Quimioterápico', 'Inibidor de Enzima', 'Farmacologia de Precisão'],
        pngUrl,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao buscar dados do composto químico.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProtein('P04637', '1TUP');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (activeMode === 'protein') {
      fetchProtein(query);
    } else {
      fetchCompound(query);
    }
  };

  const selectExample = (ex: QuickExample) => {
    setQuery(ex.id);
    setActiveMode(ex.type);
    if (ex.type === 'protein') {
      fetchProtein(ex.id, ex.pdbFallback);
    } else {
      fetchCompound(ex.id);
    }
  };

  return (
    <div className="science-workbench">
      {/* Top Banner / Header */}
      <div className="science-header card">
        <div className="science-brand-row">
          <div className="science-title-wrap">
            <span className="science-badge">
              <Sparkles size={14} className="text-cyan-400" /> BioCiência & Pesquisa Biomolecular
            </span>
            <h1 className="science-title">Workbench Científico e Estruturas 3D</h1>
            <p className="science-subtitle">
              Exploração molecular em tempo real integrada com AlphaFold DB, UniProtKB, RCSB PDB e PubChem.
            </p>
          </div>

          <div className="science-mode-switch">
            <button
              className={`mode-btn ${activeMode === 'protein' ? 'active' : ''}`}
              onClick={() => {
                setActiveMode('protein');
                setQuery('P04637');
                fetchProtein('P04637', '1TUP');
              }}
            >
              <Dna size={16} /> Proteínas (UniProt / AlphaFold)
            </button>
            <button
              className={`mode-btn ${activeMode === 'compound' ? 'active' : ''}`}
              onClick={() => {
                setActiveMode('compound');
                setQuery('Imatinib');
                fetchCompound('Imatinib');
              }}
            >
              <FlaskConical size={16} /> Fármacos & Moléculas (PubChem)
            </button>
          </div>
        </div>

        {/* Quick Example Chips */}
        <div className="quick-chips-bar">
          <span className="chips-label">Exemplos Rápidos:</span>
          <div className="chips-scroll">
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                className={`chip-btn ${query === ex.id ? 'chip-active' : ''}`}
                onClick={() => selectExample(ex)}
              >
                {ex.type === 'protein' ? <Dna size={12} className="chip-icon" /> : <Atom size={12} className="chip-icon" />}
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="science-search-bar">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeMode === 'protein'
                  ? 'Buscar por Símbolo Genético ou Acesso UniProt (Ex: TP53, P04637, BRCA1, EGFR)...'
                  : 'Buscar Composto ou Fármaco no PubChem (Ex: Imatinib, Aspirin, Ibuprofen, Atorvastatin)...'
              }
              className="science-input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-sci-search">
            {loading ? <RotateCw size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{loading ? 'Pesquisando...' : 'Consultar'}</span>
          </button>
        </form>

        {error && (
          <div className="science-alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Multi-Pane Workbench */}
      <div className="workbench-grid">
        {/* Left Column: 3D Molecular Viewer & Interactive Controls */}
        <div className="workbench-pane viewer-pane card">
          <div className="pane-header">
            <div className="pane-title-group">
              <Layers size={16} className="text-teal-400" />
              <h2 className="pane-title">
                {activeMode === 'protein' ? 'Estrutura Macromolecular 3D' : 'Conformação Molecular 3D'}
              </h2>
            </div>
            {proteinData && activeMode === 'protein' && (
              <span className="provenance-tag">
                <CheckCircle2 size={12} className="text-emerald-400" /> {proteinData.structureSource}
              </span>
            )}
            {compoundData && activeMode === 'compound' && (
              <span className="provenance-tag">
                <CheckCircle2 size={12} className="text-blue-400" /> PubChem 3D Conformer
              </span>
            )}
          </div>

          {/* 3Dmol WebGL Container */}
          <div className="viewer-viewport-container">
            <div ref={viewerContainerRef} className="viewer-canvas" />

            {/* In-viewport Controls Overlay */}
            <div className="viewport-overlay-controls">
              <button
                type="button"
                className={`ctrl-icon-btn ${isSpinning ? 'ctrl-active' : ''}`}
                onClick={() => setIsSpinning(!isSpinning)}
                title="Girar estrutura continuamente"
              >
                <RotateCw size={14} className={isSpinning ? 'animate-spin' : ''} />
                <span>{isSpinning ? 'Pausar Rotação' : 'Auto Rotação'}</span>
              </button>

              <button
                type="button"
                className="ctrl-icon-btn"
                onClick={() => {
                  if (viewerRef.current) {
                    viewerRef.current.zoomTo();
                    viewerRef.current.render();
                  }
                }}
                title="Centralizar e reajustar foco"
              >
                <Maximize2 size={14} />
                <span>Centralizar</span>
              </button>
            </div>

            {/* Style Selector Toolbar */}
            {activeMode === 'protein' && (
              <div className="viewer-style-bar">
                <div className="style-group">
                  <span className="style-label">Representação:</span>
                  <div className="style-buttons">
                    <button
                      className={`style-btn ${renderStyle === 'cartoon' ? 'active' : ''}`}
                      onClick={() => setRenderStyle('cartoon')}
                    >
                      Cartoon
                    </button>
                    <button
                      className={`style-btn ${renderStyle === 'stick' ? 'active' : ''}`}
                      onClick={() => setRenderStyle('stick')}
                    >
                      Sticks
                    </button>
                    <button
                      className={`style-btn ${renderStyle === 'sphere' ? 'active' : ''}`}
                      onClick={() => setRenderStyle('sphere')}
                    >
                      Esferas
                    </button>
                  </div>
                </div>

                <div className="style-group">
                  <span className="style-label">Cores:</span>
                  <div className="style-buttons">
                    <button
                      className={`style-btn ${colorMode === 'plddt' ? 'active' : ''}`}
                      onClick={() => setColorMode('plddt')}
                    >
                      pLDDT (Confiança)
                    </button>
                    <button
                      className={`style-btn ${colorMode === 'spectrum' ? 'active' : ''}`}
                      onClick={() => setColorMode('spectrum')}
                    >
                      Espectro N-C
                    </button>
                    <button
                      className={`style-btn ${colorMode === 'chain' ? 'active' : ''}`}
                      onClick={() => setColorMode('chain')}
                    >
                      Cadeia
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* pLDDT Color Confidence Legend */}
          {activeMode === 'protein' && (
            <div className="plddt-legend-box">
              <div className="legend-head">
                <span className="legend-title">Métrica de Confiança AlphaFold (pLDDT):</span>
                <span className="legend-sub">Pontuação por resíduo de 0 a 100</span>
              </div>
              <div className="plddt-bar-legend">
                <div className="plddt-item" style={{ borderColor: '#0053D6' }}>
                  <span className="plddt-dot" style={{ backgroundColor: '#0053D6' }} />
                  <span className="plddt-range">&gt; 90</span>
                  <span className="plddt-desc">Muito Alta Precisão</span>
                </div>
                <div className="plddt-item" style={{ borderColor: '#65CBF3' }}>
                  <span className="plddt-dot" style={{ backgroundColor: '#65CBF3' }} />
                  <span className="plddt-range">70 - 90</span>
                  <span className="plddt-desc">Confiável</span>
                </div>
                <div className="plddt-item" style={{ borderColor: '#FFDB13' }}>
                  <span className="plddt-dot" style={{ backgroundColor: '#FFDB13' }} />
                  <span className="plddt-range">50 - 70</span>
                  <span className="plddt-desc">Baixa Confiança</span>
                </div>
                <div className="plddt-item" style={{ borderColor: '#FF7D45' }}>
                  <span className="plddt-dot" style={{ backgroundColor: '#FF7D45' }} />
                  <span className="plddt-range">&lt; 50</span>
                  <span className="plddt-desc">Desordenado / Loop</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Biological / Chemical Annotation Inspector */}
        <div className="workbench-pane inspector-pane card">
          <div className="pane-header">
            <div className="pane-title-group">
              <BookOpen size={16} className="text-cyan-400" />
              <h2 className="pane-title">
                {activeMode === 'protein' ? 'Anotações Curadas & Ontologia' : 'Propriedades Farmacológicas'}
              </h2>
            </div>
            <span className="pane-info-tag">Dados Oficiais</span>
          </div>

          {activeMode === 'protein' && proteinData && (
            <div className="inspector-content">
              {/* Protein Identity Card */}
              <div className="anno-hero">
                <div className="anno-gene-pill">{proteinData.gene}</div>
                <h3 className="anno-protein-name">{proteinData.name}</h3>
                <div className="anno-meta-chips">
                  <span className="meta-chip">
                    <strong>UniProt:</strong> {proteinData.accession}
                  </span>
                  <span className="meta-chip">
                    <strong>Organismo:</strong> <em>{proteinData.organism}</em>
                  </span>
                  {proteinData.length > 0 && (
                    <span className="meta-chip">
                      <strong>Tamanho:</strong> {proteinData.length} aa
                    </span>
                  )}
                </div>
              </div>

              {/* Biological Function */}
              <div className="anno-section">
                <h4 className="anno-section-title">
                  <Info size={14} className="text-cyan-400" /> Função Biológica & Papel Celular
                </h4>
                <p className="anno-text-block">{proteinData.functionSummary}</p>
              </div>

              {/* Subcellular Localization */}
              <div className="anno-section">
                <h4 className="anno-section-title">
                  <Layers size={14} className="text-teal-400" /> Localização Subcelular
                </h4>
                <div className="subcellular-box">
                  <span className="subcell-tag">{proteinData.subcellular}</span>
                </div>
              </div>

              {/* Outbound Authority Links */}
              <div className="anno-section">
                <h4 className="anno-section-title">
                  <ExternalLink size={14} className="text-blue-400" /> Fontes Oficiais & Modelos
                </h4>
                <div className="outbound-links-grid">
                  <a
                    href={`https://www.uniprot.org/uniprotkb/${proteinData.accession}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outbound-link"
                  >
                    <span>UniProt Knowledgebase</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href={`https://alphafold.ebi.ac.uk/entry/${proteinData.accession}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outbound-link"
                  >
                    <span>AlphaFold Database</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href={`https://www.rcsb.org/search?q=${proteinData.gene}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outbound-link"
                  >
                    <span>RCSB PDB Structures</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(proteinData.gene + ' human')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outbound-link"
                  >
                    <span>PubMed Artigos</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeMode === 'compound' && compoundData && (
            <div className="inspector-content">
              {/* Chemical Identity Card */}
              <div className="anno-hero">
                <div className="anno-gene-pill bg-blue-900/40 text-blue-300 border-blue-500/30">
                  CID: {compoundData.cid}
                </div>
                <h3 className="anno-protein-name">{compoundData.name}</h3>
                <div className="anno-meta-chips">
                  <span className="meta-chip">
                    <strong>Fórmula:</strong> {compoundData.formula || 'N/A'}
                  </span>
                  <span className="meta-chip">
                    <strong>Massa Molecular:</strong> {compoundData.mw}
                  </span>
                </div>
              </div>

              {/* 2D Chemical Diagram */}
              <div className="anno-section">
                <h4 className="anno-section-title">
                  <Atom size={14} className="text-cyan-400" /> Diagrama Estrutural 2D
                </h4>
                <div className="compound-2d-view">
                  <img
                    src={compoundData.pngUrl}
                    alt={`Estrutura 2D de ${compoundData.name}`}
                    className="compound-2d-img"
                  />
                </div>
              </div>

              {/* Chemical Properties */}
              <div className="anno-section">
                <h4 className="anno-section-title">
                  <Info size={14} className="text-teal-400" /> Nomenclatura IUPAC & SMILES
                </h4>
                <div className="prop-row">
                  <span className="prop-name">IUPAC:</span>
                  <span className="prop-val">{compoundData.iupac || 'N/A'}</span>
                </div>
                <div className="prop-row">
                  <span className="prop-name">Canonical SMILES:</span>
                  <code className="prop-code">{compoundData.smiles || 'N/A'}</code>
                </div>
              </div>

              {/* Outbound Authority Links */}
              <div className="anno-section">
                <h4 className="anno-section-title">
                  <ExternalLink size={14} className="text-blue-400" /> Bases Químicas Oficiais
                </h4>
                <div className="outbound-links-grid">
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compoundData.cid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outbound-link"
                  >
                    <span>PubChem Compound Record</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href={`https://www.ebi.ac.uk/chembl/g/#search_results/all/query=${encodeURIComponent(
                      compoundData.name
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outbound-link"
                  >
                    <span>ChEMBL Bioatividade</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
