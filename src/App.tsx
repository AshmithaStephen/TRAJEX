import { FormEvent, useEffect, useState } from "react";

type Page = "Dashboard" | "Live Cameras" | "Vehicle Search" | "Trajectory" | "Traffic Analytics";

const navigation: { label: Page; icon: string }[] = [
  { label: "Dashboard", icon: "grid" },
  { label: "Live Cameras", icon: "camera" },
  { label: "Vehicle Search", icon: "search" },
  { label: "Trajectory", icon: "route" },
  { label: "Traffic Analytics", icon: "chart" },
];

type Camera = { camera_id: string; name: string; location: string; status: string; plate_detector_status?: string };
type Observation = { observation_id?: string; camera_id: string; camera_name: string; track_id: number; plate: string; ocr_confidence: number; timestamp: string; latitude: number; longitude: number; time?: string; short?: string; camera?: string; track?: string; confidence?: string; location?: string };
type TrajectoryData = { vehicle: { plate: string; global_vehicle_id: string }; observations: Observation[]; camera_sequence: string[]; total_distance_km: number; journey_duration_minutes: number; average_speed_kmh: number; transition_warning: boolean; route_geometry: { latitude: number; longitude: number }[] };

const observations: Observation[] = [];

const CAMERA_API_URL = "http://localhost:8000";
const CAMERA_CONFIG: Camera[] = [
  { camera_id: "C01", name: "Madiwala Signal", location: "Madiwala Signal, Bengaluru", status: "LIVE" },
  { camera_id: "C02", name: "St John's Signal", location: "St John's Signal, Bengaluru", status: "LIVE" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    route: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h2a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <><path d="M9 5v14M15 5v14" /></>,
    restart: <><path d="M4 9a8 8 0 1 1 1 8" /><path d="M4 4v5h5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    car: <><path d="m5 17-1-1v-5l2-5h12l2 5v5l-1 1" /><path d="M4 12h16M7 16h.01M17 16h.01M6 17v2M18 17v2" /></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function Header({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="h-[68px] border-b border-[#222a31] flex items-center justify-between px-6 bg-[#0b0f12]">
      <div className="flex items-center gap-2.5 text-sm text-[#bbc4ca]">
        <Icon name="pin" size={16} />
        <span>Bengaluru, Karnataka</span>
      </div>
      <div className="flex items-center gap-5">
        <button onClick={onSearch} className="w-[310px] h-9 border border-[#293139] hover:border-[#41505b] transition-colors bg-[#11171b] flex items-center px-3 gap-2.5 text-[#77838c] text-xs">
          <Icon name="search" size={15} />
          Search vehicle or plate
          <span className="ml-auto border border-[#303941] px-1.5 py-0.5 text-[9px]">/</span>
        </button>
        <div className="flex items-center gap-2 text-[11px] tracking-wide text-[#aab4ba]">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#45d19a] opacity-30" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#45d19a]" /></span>
          SYSTEM ONLINE
        </div>
      </div>
    </header>
  );
}

function MapGraphic({ active = 1, progress = 100, analytics = false, twoCamera = false }: { active?: number; progress?: number; analytics?: boolean; twoCamera?: boolean }) {
  const nodes = (twoCamera ? [
    [18, 72, "C01"],
    [40, 53, "C02"],
  ] : [
    [18, 72, "C01"],
    [40, 53, "C02"],
    [65, 61, "C05"],
    [83, 31, "C06"],
  ]);
  return (
    <div className="map-grid absolute inset-0 overflow-hidden bg-[#0c1216]">
      <svg viewBox="0 0 1000 620" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <g fill="none" stroke="#273139" strokeWidth="2">
          <path d="M-40 490C120 430 179 287 345 299s211 148 341 80 213-203 360-181" />
          <path d="M30 105c116 72 218 71 319 9s212-51 283 36 226 76 391 17" />
          <path d="M97 650c48-139 65-256 10-356S77 86 186-30" />
          <path d="M521 650c-2-136 49-217 139-301S807 144 785-30" />
          <path d="M327 650c21-125-18-215-102-271S89 232 136 116" />
          <path d="M-20 221c151 6 235 31 333 104s234 106 364 103 233 42 343 130" />
        </g>
        <g fill="none" stroke="#172027" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M${i * 126 - 80} -20L${i * 112 + 100} 650`} />)}
          {Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M-20 ${i * 116 + 36}L1020 ${i * 93 + 84}`} />)}
        </g>
        {analytics ? (
          <>
            <defs><radialGradient id="heatA"><stop stopColor="#f05f45" stopOpacity=".55" /><stop offset="1" stopColor="#f05f45" stopOpacity="0" /></radialGradient><radialGradient id="heatB"><stop stopColor="#e7a83e" stopOpacity=".42" /><stop offset="1" stopColor="#e7a83e" stopOpacity="0" /></radialGradient></defs>
            <ellipse cx="380" cy="325" rx="170" ry="120" fill="url(#heatA)" />
            <ellipse cx="735" cy="250" rx="210" ry="145" fill="url(#heatB)" />
            <ellipse cx="600" cy="500" rx="140" ry="100" fill="url(#heatA)" opacity=".5" />
          </>
        ) : (
          <>
            <path d="M180 446C257 416 306 347 400 329S560 395 650 378s108-126 180-186" fill="none" stroke="#0d323d" strokeWidth="10" />
            <path d="M180 446C257 416 306 347 400 329S560 395 650 378s108-126 180-186" fill="none" stroke="#28b8df" strokeWidth="3.5" strokeDasharray="900" strokeDashoffset={900 - (progress / 100) * 900} className="transition-all duration-300" />
            {[["292", "382", "315", "364"], ["518", "358", "542", "369"], ["744", "284", "762", "260"]].map((a, i) => (
              <path key={i} d={`M${a[0]} ${a[1]}L${a[2]} ${a[3]}`} stroke="#8de8ff" strokeWidth="2" markerEnd="url(#arrowhead)" />
            ))}
            <defs><marker id="arrowhead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5 0 7Z" fill="#8de8ff" /></marker></defs>
          </>
        )}
      </svg>
      <div className="absolute left-[7%] top-[10%] text-[10px] tracking-[.18em] text-[#43515b]">PEENYA INDUSTRIAL AREA</div>
      <div className="absolute right-[9%] top-[45%] text-[10px] tracking-[.18em] text-[#43515b]">CENTRAL BENGALURU</div>
      <div className="absolute left-[44%] bottom-[12%] text-[10px] tracking-[.18em] text-[#43515b]">MAJESTIC</div>
      {nodes.map(([x, y, label], i) => (
        <div key={label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
          <div className={`relative h-4 w-4 rounded-full border-2 ${active === i && !analytics ? "border-[#98ebff] bg-[#28b8df] scale-125" : "border-[#65808d] bg-[#11181d]"} transition-all`}>
            {active === i && !analytics && <span className="absolute -inset-2 rounded-full border border-[#3ac7e8]/30 animate-ping" />}
          </div>
          <div className={`absolute left-5 -top-2 whitespace-nowrap border px-2 py-1 text-[10px] tracking-wider ${active === i && !analytics ? "border-[#286476] bg-[#10232a] text-[#9cecff]" : "border-[#303b43] bg-[#10161a] text-[#84939c]"}`}>{label}</div>
        </div>
      ))}
      <div className="absolute bottom-4 left-5 flex items-center gap-4 text-[9px] tracking-wider text-[#66747d]">
        <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#28b8df]" />CAMERA NODE</span>
        <span className="flex items-center gap-1.5"><i className="h-[2px] w-5 bg-[#28b8df]" />VEHICLE ROUTE</span>
      </div>
    </div>
  );
}

function Dashboard({ navigate }: { navigate: (page: Page) => void }) {
  const stats = [["ACTIVE CAMERAS", "24", "24 online"], ["VEHICLES DETECTED", "1,284", "today"], ["ACTIVE TRAJECTORIES", "38", "live now"]];
  return (
    <PageFrame eyebrow="Network overview" title="City movement">
      <div className="grid grid-cols-3 border-y border-[#232c32] mb-5">
        {stats.map((s, i) => <div key={s[0]} className={`py-4 ${i ? "border-l border-[#232c32] pl-6" : ""}`}><div className="text-[10px] tracking-[.17em] text-[#70808a]">{s[0]}</div><div className="mt-1.5 flex items-baseline gap-2"><span className="text-2xl font-medium text-[#edf3f5]">{s[1]}</span><span className="text-[10px] text-[#5f727c]">{s[2]}</span></div></div>)}
      </div>
      <div className="relative min-h-[530px] flex-1 border border-[#253039]">
        <MapGraphic />
        <div className="absolute right-4 top-4 w-[224px] border border-[#2a343c] bg-[#0c1216]/95">
          <div className="border-b border-[#263038] px-4 py-3 text-[10px] tracking-[.16em] text-[#8e9ba3]">RECENT DETECTIONS</div>
          {[["KA01AB1234", "C01", "10:05:21"], ["KA05MN8271", "C03", "10:06:48"], ["KA03XY4512", "C02", "10:07:13"]].map((r, i) => (
            <button key={r[0]} onClick={() => navigate(i === 0 ? "Trajectory" : "Vehicle Search")} className="group w-full border-b border-[#1f282e] px-4 py-3 text-left last:border-0 hover:bg-[#121c21]">
              <div className="font-mono text-[12px] text-[#dce6ea] group-hover:text-[#78dcf5]">{r[0]}</div>
              <div className="mt-1 flex justify-between text-[10px] text-[#687781]"><span>Camera {r[1]}</span><span>{r[2]}</span></div>
            </button>
          ))}
        </div>
        <button onClick={() => navigate("Trajectory")} className="absolute bottom-4 right-4 flex items-center gap-2 border border-[#2f7d92] bg-[#102931] px-4 py-2.5 text-[11px] tracking-wide text-[#8feaff] hover:bg-[#153640]">
          OPEN LIVE TRAJECTORY <Icon name="arrow" size={14} />
        </button>
      </div>
    </PageFrame>
  );
}

function CameraFeed({ camera, onClick }: { camera: Camera; onClick: () => void }) {
  const [vehicles, setVehicles] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const updateVehicleCount = async () => {
      try {
        const response = await fetch(`${CAMERA_API_URL}/api/cameras/${camera.camera_id}/status`);
        if (!response.ok) return;
        const status = await response.json() as { vehicles_detected: number };
        if (mounted) setVehicles(status.vehicles_detected);
      } catch {
        if (mounted) setVehicles(null);
      }
    };

    updateVehicleCount();
    const timer = window.setInterval(updateVehicleCount, 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [camera.camera_id]);

  return (
    <button onClick={onClick} className="group relative min-h-[255px] overflow-hidden border border-[#273139] text-left">
      <img src={`${CAMERA_API_URL}/api/cameras/${camera.camera_id}/stream`} alt={`YOLO and ByteTrack processed traffic video from ${camera.name}`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      <div className="absolute inset-0 bg-[#081014]/15" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-[#080d10]/90 to-transparent px-4 pb-10 pt-4">
        <div><div className="text-[10px] tracking-[.15em] text-[#72d7ed]">{camera.camera_id}</div><div className="mt-1 text-sm text-[#edf3f5]">{camera.name}</div></div>
        <div className="text-[10px] text-[#49d39d]">● LIVE</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080d10] via-[#080d10]/90 to-transparent px-4 pb-4 pt-12">
        <div className="text-[10px] text-[#d6e4e8]">Vehicles detected: {vehicles === null ? "--" : vehicles}</div>
      </div>
    </button>
  );
}

function LiveCameras() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <PageFrame eyebrow="ANPR camera network" title="Live cameras" aside={<span className="text-[10px] text-[#68757d]">2 OF 2 FEEDS SHOWN</span>}>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">{CAMERA_CONFIG.map(camera => <CameraFeed key={camera.camera_id} camera={camera} onClick={() => setSelected(camera.camera_id)} />)}</div>
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-12" onClick={() => setSelected(null)}>
        <div className="w-full max-w-5xl border border-[#34414a] bg-[#0b1014]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-[#263039] px-5 py-4"><div><span className="text-xs tracking-[.18em] text-[#72d7ed]">{selected}</span><span className="ml-4 text-sm text-[#aeb8be]">{CAMERA_CONFIG.find(camera => camera.camera_id === selected)?.name}</span></div><button onClick={() => setSelected(null)} className="text-[#87949c] hover:text-white"><Icon name="close" /></button></div>
          <div className="grid grid-cols-[1fr_280px]">
            <div className="relative h-[520px] overflow-hidden"><img src={`${CAMERA_API_URL}/api/cameras/${selected}/stream`} alt={`Enlarged YOLO and ByteTrack feed from ${selected}`} className="h-full w-full object-cover" /><span className="absolute left-4 top-4 text-[10px] text-[#52dda4]">● LIVE</span></div>
            <div className="p-5"><div className="text-[10px] tracking-[.16em] text-[#77858e]">CAMERA STATUS</div><div className="mt-4 border-l-2 border-[#35bddc] bg-[#11191e] p-4"><div className="text-sm text-white">{CAMERA_CONFIG.find(camera => camera.camera_id === selected)?.name}</div><div className="mt-2 font-mono text-xs text-[#72d7ed]">{selected}</div><div className="mt-5 text-[11px] text-[#d6e4e8]">YOLO vehicle boxes include local ByteTrack IDs. Cross-camera identity comes from plate observations.</div></div></div>
          </div>
        </div>
      </div>}
    </PageFrame>
  );
}

function LegacyVehicleSearch({ navigate }: { navigate: (page: Page) => void }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  function submit(e: FormEvent) { e.preventDefault(); if (query.trim()) setSearched(true); }
  return (
    <PageFrame eyebrow="Global vehicle identity" title="Search vehicle">
      <form onSubmit={submit} className="border-y border-[#263039] py-5">
        <div className="flex max-w-3xl gap-2"><div className="flex h-12 flex-1 items-center gap-3 border border-[#38434b] bg-[#10161a] px-4 focus-within:border-[#3aaac4]"><Icon name="search" size={18} /><input value={query} onChange={e => setQuery(e.target.value.toUpperCase())} placeholder="Enter license plate number" className="w-full bg-transparent font-mono text-sm tracking-wider text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-[#57646d]" /></div><button className="bg-[#d9f5fa] px-7 text-xs font-medium text-[#081115] hover:bg-white">Search vehicle</button></div>
        <div className="mt-3 flex gap-5 text-[10px] text-[#65737c]"><span>DATE <b className="ml-2 font-normal text-[#a7b1b7]">Today</b></span><span>TIME RANGE <b className="ml-2 font-normal text-[#a7b1b7]">All day</b></span></div>
      </form>
      {!searched ? <div className="flex flex-1 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#28343b] text-[#5c707a]"><Icon name="car" size={22} /></div><p className="text-sm text-[#8b989f]">Search a license plate across the camera network</p><button onClick={() => { setQuery("KA01AB1234"); setSearched(true); }} className="mt-3 font-mono text-[11px] text-[#49bad3] hover:text-[#8feaff]">Try KA01AB1234</button></div> :
      <div className="flex-1 pt-6">
        <div className="flex items-start justify-between"><div><div className="font-mono text-xl tracking-wider text-white">KA01AB1234</div><div className="mt-2 text-[10px] tracking-[.15em] text-[#45c996]">GLOBAL VEHICLE IDENTITY · MATCHED</div></div>
          <div className="grid grid-cols-4 border-l border-[#283139]">{[["FIRST SEEN","10:05"],["LAST SEEN","10:25"],["CAMERAS","4"],["DISTANCE","8.7 km"]].map(s => <div key={s[0]} className="min-w-[105px] border-r border-[#283139] px-4"><div className="text-[9px] tracking-wider text-[#67757e]">{s[0]}</div><div className="mt-1 text-sm">{s[1]}</div></div>)}</div>
        </div>
        <div className="mt-7 border-t border-[#273139]"><div className="grid grid-cols-[100px_1.4fr_1fr_1fr_80px] border-b border-[#273139] py-2 text-[9px] tracking-[.14em] text-[#64727b]"><span>TIME</span><span>CAMERA / LOCATION</span><span>LOCAL TRACK ID</span><span>OCR CONFIDENCE</span><span>STATUS</span></div>
          {observations.map((o, i) => <div key={o.camera} className="grid grid-cols-[100px_1.4fr_1fr_1fr_80px] items-center border-b border-[#20282e] py-4 text-xs hover:bg-[#10171b]"><span className="font-mono text-[#b6c1c7]">{o.time}</span><span><b className="mr-3 font-normal text-[#59cce6]">{o.camera}</b><small className="text-[10px] text-[#64727b]">{o.location}</small></span><span><b className="border border-[#35414a] px-2 py-1 font-mono font-normal text-[#c7d1d6]">{o.track}</b>{i > 0 && <small className="ml-2 text-[9px] text-[#5e6b73]">changed</small>}</span><span>{o.confidence}</span><span className="text-[9px] text-[#46c996]">MATCHED</span></div>)}
        </div>
        <div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-[#66757e]">Local Track IDs change by camera. ANPR maintains one global vehicle identity.</p><button onClick={() => navigate("Trajectory")} className="flex items-center gap-2 bg-[#d9f5fa] px-5 py-3 text-[11px] font-medium text-[#071014] hover:bg-white">VIEW TRAJECTORY <Icon name="arrow" size={14} /></button></div>
      </div>}
    </PageFrame>
  );
}

function VehicleSearch({ navigate }: { navigate: (page: Page) => void }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ plate: string; global_vehicle_id: string; observations: Observation[] } | null>(null);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const plate = query.trim().toUpperCase().replace(/\s+/g, "");
    if (!plate) return;
    sessionStorage.setItem("urbantrace_plate", plate);
    try {
      const response = await fetch(`${CAMERA_API_URL}/api/vehicles/${encodeURIComponent(plate)}/observations`);
      if (!response.ok) throw new Error("Vehicle not found or OCR observations are not available yet.");
      const data = await response.json();
      setResult(data);
      setError("");
    } catch (searchError) {
      setResult(null);
      setError(searchError instanceof Error ? searchError.message : "Backend unavailable");
    }
  }
  return <PageFrame eyebrow="Global vehicle identity" title="Search vehicle">
    <form onSubmit={submit} className="border-y border-[#263039] py-5"><div className="flex max-w-3xl gap-2"><div className="flex h-12 flex-1 items-center gap-3 border border-[#38434b] bg-[#10161a] px-4 focus-within:border-[#3aaac4]"><Icon name="search" size={18} /><input value={query} onChange={event => setQuery(event.target.value.toUpperCase())} placeholder="Enter recognized license plate" className="w-full bg-transparent font-mono text-sm tracking-wider text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-[#57646d]" /></div><button className="bg-[#d9f5fa] px-7 text-xs font-medium text-[#081115] hover:bg-white">Search vehicle</button></div></form>
    {error && <div className="mt-5 border-l-2 border-[#d4a348] bg-[#151516] p-4 text-xs text-[#d8c18d]">{error}</div>}
    {!result && !error && <div className="flex flex-1 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#28343b] text-[#5c707a]"><Icon name="car" size={22} /></div><p className="text-sm text-[#8b989f]">Search only plates actually recognized by the configured OCR pipeline.</p></div>}
    {result && <div className="flex-1 pt-6"><div className="font-mono text-xl tracking-wider text-white">{result.plate}</div><div className="mt-2 text-[10px] tracking-[.15em] text-[#45c996]">GLOBAL VEHICLE IDENTITY · {result.global_vehicle_id}</div><div className="mt-7 border-t border-[#273139]"><div className="grid grid-cols-[110px_1.4fr_1fr_1fr] border-b border-[#273139] py-2 text-[9px] tracking-[.14em] text-[#64727b]"><span>TIME</span><span>CAMERA / LOCATION</span><span>LOCAL TRACK ID</span><span>OCR CONFIDENCE</span></div>{result.observations.map(observation => <div key={observation.observation_id ?? `${observation.camera_id}-${observation.track_id}`} className="grid grid-cols-[110px_1.4fr_1fr_1fr] items-center border-b border-[#20282e] py-4 text-xs"><span className="font-mono text-[#b6c1c7]">{new Date(observation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><span><b className="mr-3 font-normal text-[#59cce6]">{observation.camera_id}</b><small className="text-[10px] text-[#64727b]">{observation.camera_name}</small></span><span className="font-mono text-[#c7d1d6]">Track {observation.track_id}</span><span>{Math.round(observation.ocr_confidence * 100)}%</span></div>)}</div><div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-[#66757e]">Track IDs are local to each camera. The plate creates the global identity.</p><button onClick={() => navigate("Trajectory")} className="flex items-center gap-2 bg-[#d9f5fa] px-5 py-3 text-[11px] font-medium text-[#071014] hover:bg-white">VIEW TRAJECTORY <Icon name="arrow" size={14} /></button></div></div>}
  </PageFrame>;
}

function LegacyTrajectory() {
  const [active, setActive] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(42);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress(p => {
      if (p >= 100) { setPlaying(false); return 100; }
      const next = p + 1;
      setActive(Math.min(3, Math.floor(next / 26)));
      return next;
    }), 100);
    return () => clearInterval(timer);
  }, [playing]);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex items-end justify-between"><div><div className="mb-2 text-[10px] uppercase tracking-[.2em] text-[#4fbcd4]">Trajectory reconstruction</div><h1 className="text-[26px] font-medium tracking-tight text-[#e9eff2]">KA01AB1234</h1></div><div className="text-right"><div className="text-[10px] tracking-wider text-[#60717b]">GLOBAL VEHICLE ID</div><div className="mt-1 text-[11px] text-[#41c893]">4 OBSERVATIONS MATCHED</div></div></div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_275px] border border-[#273139]">
        <div className="relative min-h-[560px]"><MapGraphic active={active} progress={progress} />
          <div className="absolute left-4 top-4 border border-[#2b353d] bg-[#0b1115]/95 px-3 py-2 text-[10px] text-[#87959d]">BENGALURU · 8.7 KM ROUTE</div>
          <div className="absolute inset-x-4 bottom-4 border border-[#303a42] bg-[#0a1014]/95 p-3">
            <div className="flex items-center gap-3"><button onClick={() => setPlaying(!playing)} className="flex h-8 w-8 items-center justify-center bg-[#d9f5fa] text-[#071014]">{playing ? <Icon name="pause" size={14} /> : <Icon name="play" size={14} />}</button><button onClick={() => { setPlaying(false); setProgress(0); setActive(0); }} className="text-[#82919a] hover:text-white"><Icon name="restart" size={16} /></button><div className="relative h-1 flex-1 bg-[#29343b]"><div className="absolute inset-y-0 left-0 bg-[#37c4e3]" style={{ width: `${progress}%` }} /><input aria-label="Journey progress" type="range" min="0" max="100" value={progress} onChange={e => { const p = Number(e.target.value); setProgress(p); setActive(Math.min(3, Math.floor(p / 26))); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></div><span className="w-10 font-mono text-[10px] text-[#82919a]">{Math.round(progress * 0.21)}:00</span></div>
          </div>
        </div>
        <aside className="border-l border-[#273139] bg-[#0d1317]">
          <div className="border-b border-[#273139] p-4"><div className="grid grid-cols-2 gap-y-4">{[["VEHICLE","Car"],["JOURNEY","8.7 km"],["DURATION","21 min"],["AVG. SPEED","24 km/h"]].map(s => <div key={s[0]}><div className="text-[9px] tracking-wider text-[#5e6d76]">{s[0]}</div><div className="mt-1 text-xs text-[#d8e1e5]">{s[1]}</div></div>)}</div></div>
          <div className="p-4"><div className="mb-3 text-[9px] tracking-[.16em] text-[#687780]">CAMERA SEQUENCE</div>{observations.map((o, i) => <button key={o.camera} onClick={() => { setActive(i); setProgress(i * 32 + 5); }} className={`relative flex w-full gap-3 border-l py-2.5 pl-4 text-left ${active === i ? "border-[#48c9e5] bg-[#111d22]" : "border-[#2b363d] hover:bg-[#10171b]"}`}><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${active === i ? "bg-[#4bd4ef]" : "bg-[#43525b]"}`} /><span><span className="block font-mono text-[11px] text-[#d7e1e5]">{o.short} <b className="ml-2 font-normal text-[#66d3ea]">{o.camera}</b></span><span className="mt-1 block text-[9px] text-[#65737c]">Track {o.track} · OCR {o.confidence}</span></span></button>)}</div>
          <div className="mx-4 border-t border-[#263038] pt-4"><div className="text-[9px] tracking-wider text-[#5e6d76]">SELECTED OBSERVATION</div><div className="mt-2 text-sm text-[#dce6ea]">Camera {observations[active].camera}</div><div className="mt-3 grid grid-cols-2 gap-y-2 text-[10px]"><span className="text-[#61717a]">Timestamp</span><span className="text-right font-mono">{observations[active].time}</span><span className="text-[#61717a]">Local Track ID</span><span className="text-right">{observations[active].track}</span><span className="text-[#61717a]">Plate confidence</span><span className="text-right">{observations[active].confidence}</span></div></div>
        </aside>
      </div>
    </div>
  );
}

function Trajectory() {
  const [data, setData] = useState<TrajectoryData | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const plate = sessionStorage.getItem("urbantrace_plate");
    if (!plate) {
      setError("Search an OCR-recognized plate before opening a trajectory.");
      return;
    }
    fetch(`${CAMERA_API_URL}/api/vehicles/${encodeURIComponent(plate)}/trajectory`).then(async response => {
      if (!response.ok) throw new Error("No trajectory available. Search a plate recognized by OCR first.");
      return response.json();
    }).then(setData).catch(reason => setError(reason instanceof Error ? reason.message : "Backend unavailable"));
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress(value => { if (value >= 100) { setPlaying(false); return 100; } return value + 1; }), 80);
    return () => window.clearInterval(timer);
  }, [playing]);
  return <PageFrame eyebrow="Trajectory reconstruction" title={data?.vehicle.plate ?? "Vehicle trajectory"}>
    {error && <div className="border-l-2 border-[#d4a348] bg-[#151516] p-4 text-xs text-[#d8c18d]">{error}</div>}
    {data && <div className="grid min-h-0 flex-1 grid-cols-[1fr_275px] border border-[#273139]"><div className="relative min-h-[560px]"><MapGraphic active={progress >= 50 ? 1 : 0} progress={progress} /><div className="absolute left-4 top-4 border border-[#2b353d] bg-[#0b1115]/95 px-3 py-2 text-[10px] text-[#87959d]">{data.camera_sequence.join(" → ")} · {data.total_distance_km} KM</div><div className="absolute inset-x-4 bottom-4 border border-[#303a42] bg-[#0a1014]/95 p-3"><div className="flex items-center gap-3"><button onClick={() => setPlaying(!playing)} className="flex h-8 w-8 items-center justify-center bg-[#d9f5fa] text-[#071014]">{playing ? <Icon name="pause" size={14} /> : <Icon name="play" size={14} />}</button><div className="relative h-1 flex-1 bg-[#29343b]"><div className="absolute inset-y-0 left-0 bg-[#37c4e3]" style={{ width: `${progress}%` }} /></div><span className="font-mono text-[10px] text-[#82919a]">Replay journey</span></div></div></div><aside className="border-l border-[#273139] bg-[#0d1317]"><div className="border-b border-[#273139] p-4"><div className="font-mono text-sm text-white">{data.vehicle.global_vehicle_id}</div><div className="mt-4 grid grid-cols-2 gap-y-4">{[["JOURNEY", `${data.total_distance_km} km`],["DURATION", `${data.journey_duration_minutes} min`],["AVG. SPEED", `${data.average_speed_kmh} km/h`],["TRANSITION", data.transition_warning ? "WARNING" : "VALID"]].map(item => <div key={item[0]}><div className="text-[9px] tracking-wider text-[#5e6d76]">{item[0]}</div><div className="mt-1 text-xs text-[#d8e1e5]">{item[1]}</div></div>)}</div></div><div className="p-4"><div className="mb-3 text-[9px] tracking-[.16em] text-[#687780]">CAMERA SEQUENCE</div>{data.observations.map((observation, index) => <div key={observation.observation_id ?? `${observation.camera_id}-${observation.track_id}`} className="border-l border-[#48c9e5] py-2.5 pl-4"><div className="font-mono text-[11px] text-[#d7e1e5]">{new Date(observation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} <b className="ml-2 font-normal text-[#66d3ea]">{observation.camera_id}</b></div><div className="mt-1 text-[9px] text-[#65737c]">{observation.camera_name} · Track {observation.track_id} · OCR {Math.round(observation.ocr_confidence * 100)}%</div>{index < data.observations.length - 1 && <div className="mt-2 text-[#56656e]">↓</div>}</div>)}</div></aside></div>}
  </PageFrame>;
}

function TrafficAnalytics() {
  return (
    <PageFrame eyebrow="Aggregated vehicle movement" title="Traffic analytics">
      <div className="grid grid-cols-3 border-y border-[#263039] mb-4">{[["TRAFFIC DENSITY","Moderate","Central zone"],["AVERAGE SPEED","31 km/h","− 4.2%"],["VEHICLES / HOUR","2,840","+ 6.8%"]].map((s,i) => <div key={s[0]} className={`py-3 ${i ? "border-l border-[#263039] pl-5" : ""}`}><div className="text-[9px] tracking-[.16em] text-[#65747d]">{s[0]}</div><span className="mt-1.5 inline-block text-lg text-[#e0e7ea]">{s[1]}</span><span className="ml-2 text-[9px] text-[#72818a]">{s[2]}</span></div>)}</div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px] border border-[#273139]">
        <div className="relative min-h-[500px]"><MapGraphic analytics /><div className="absolute left-4 top-4 border border-[#2b353d] bg-[#0b1115]/95 p-3"><div className="text-[9px] tracking-wider text-[#71808a]">TRAFFIC DENSITY</div><div className="mt-2 flex gap-3 text-[9px] text-[#89969d]"><span>LOW</span><i className="h-2 w-16 bg-gradient-to-r from-[#394d42] via-[#c29b3c] to-[#d55543]" /><span>HIGH</span></div></div></div>
        <aside className="border-l border-[#273139] bg-[#0d1317] p-4"><div className="text-[9px] tracking-[.16em] text-[#697780]">VEHICLES PER HOUR</div><div className="mt-5 flex h-28 items-end gap-2 border-b border-[#29343b]">{[35,48,62,55,80,70,92,76,64,49].map((h,i) => <div key={i} className="flex-1 bg-[#24798d]" style={{height:`${h}%`,opacity:.45+i*.04}} />)}</div><div className="mt-2 flex justify-between text-[8px] text-[#55636c]"><span>06:00</span><span>12:00</span><span>18:00</span></div>
          <div className="mt-8 text-[9px] tracking-[.16em] text-[#697780]">VEHICLE MOVEMENT</div><div className="mt-3 space-y-2">{[["C01","C02","482"],["C02","C05","367"],["C05","C06","291"]].map(r => <div key={r[0]} className="flex items-center border-b border-[#222b31] pb-2 text-[11px]"><span className="text-[#73d6ec]">{r[0]}</span><span className="mx-2 text-[#56656e]">→</span><span className="text-[#73d6ec]">{r[1]}</span><span className="ml-auto font-mono text-[#8e9ba2]">{r[2]}</span></div>)}</div>
          <div className="mt-8 border-l-2 border-[#3fbdd9] pl-3 text-[10px] leading-5 text-[#7f8d95]">Individual trajectories aggregated into city-wide movement insights.</div>
        </aside>
      </div>
    </PageFrame>
  );
}

function PageFrame({ eyebrow, title, aside, children }: { eyebrow: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col"><div className="mb-5 flex items-end justify-between"><div><div className="mb-2 text-[10px] uppercase tracking-[.2em] text-[#4fbcd4]">{eyebrow}</div><h1 className="text-[26px] font-medium tracking-tight text-[#e9eff2]">{title}</h1></div>{aside}</div>{children}</div>;
}

export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  return (
    <div className="flex min-h-screen bg-[#090d10] text-[#d7dfe3]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[210px] flex-col border-r border-[#222a31] bg-[#0b0f12]">
        <button onClick={() => setPage("Dashboard")} className="flex h-[68px] items-center gap-3 border-b border-[#222a31] px-5 text-left">
          <span className="relative flex h-8 w-8 items-center justify-center border border-[#2f6978]"><span className="h-3 w-3 rotate-45 border-2 border-[#66d9f0]" /></span>
          <span><strong className="block text-sm font-semibold tracking-[.22em] text-white">TRAJEX</strong><small className="mt-0.5 block text-[8px] tracking-[.12em] text-[#66757e]">TRAFFIC INTELLIGENCE</small></span>
        </button>
        <nav className="mt-5 space-y-1 px-3">{navigation.map(item => <button key={item.label} onClick={() => setPage(item.label)} className={`relative flex h-10 w-full items-center gap-3 px-3 text-[12px] transition-colors ${page === item.label ? "bg-[#111b20] text-[#dff9ff]" : "text-[#78868f] hover:bg-[#10161a] hover:text-[#c1cbd0]"}`}>{page === item.label && <span className="absolute inset-y-2 left-0 w-[2px] bg-[#4bc9e5]" />}<Icon name={item.icon} size={16} /><span>{item.label}</span></button>)}</nav>
        <div className="mt-auto border-t border-[#222a31] p-4"><div className="text-[8px] tracking-[.16em] text-[#53616a]">CITY NETWORK</div><div className="mt-2 flex items-center justify-between text-[10px] text-[#89969e]"><span>24 cameras</span><span className="text-[#43c995]">Operational</span></div><div className="mt-3 h-px bg-[#232d33]"><div className="h-px w-full bg-[#327d8e]" /></div></div>
      </aside>
      <main className="ml-[210px] flex min-h-screen flex-1 flex-col"><Header onSearch={() => setPage("Vehicle Search")} /><div className="h-[calc(100vh-68px)] min-h-[660px] p-6">{page === "Dashboard" && <Dashboard navigate={setPage} />}{page === "Live Cameras" && <LiveCameras />}{page === "Vehicle Search" && <VehicleSearch navigate={setPage} />}{page === "Trajectory" && <Trajectory />}{page === "Traffic Analytics" && <TrafficAnalytics />}</div></main>
    </div>
  );
}
