'use client';
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const colorPalette = ['#d97777', '#77a6d9', '#d9b877', '#77d9a1', '#a877d9', '#d977b0', '#77c3d9', '#d99e77'];

export default function ForceBubbleChart() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [centers, setCenters] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [groupKey, setGroupKey] = useState('工作界別');

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
  const [svgHeight, setSvgHeight] = useState(600);

  useEffect(() => {
    async function fetchMembers() {
      const { data, error } = await supabase.from('members').select('*');
      if (error) {
        console.error("讀取失敗:", error);
        return;
      }
      if (data) {
        setRawData(data);
        setIsLoading(false);
      }
    }
    fetchMembers();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 600
        });
      }
    };
    window.addEventListener('resize', updateSize);
    setTimeout(updateSize, 100);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (rawData.length === 0 || dimensions.width === 0) return;

    const { width } = dimensions;
    const isMobile = width < 768;
    const isLargeData = rawData.length > 80; 
    
    const cols = isMobile ? 2 : 4; 
    const rowHeight = isMobile ? (isLargeData ? 240 : 180) : (isLargeData ? 320 : 220); 
    
    const uniqueCategories = Array.from(new Set(rawData.map((d: any) => d[groupKey]))).filter(Boolean) as string[];
    
    const newCenters: any = {};
    uniqueCategories.forEach((category: string, index: number) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      newCenters[category] = { 
        x: (col + 0.5) * (width / cols), 
        y: (row + 0.5) * rowHeight + (isLargeData ? 60 : 40)
      };
    });

    const totalRows = Math.ceil(uniqueCategories.length / cols);
    const calculatedHeight = Math.max(isMobile ? 500 : 600, totalRows * rowHeight + 100);
    
    setSvgHeight(calculatedHeight);
    setCategories(uniqueCategories);
    setCenters(newCenters);

    // 🌟 智能縮放：人多嗰陣，氣泡自動縮細
    const radiusSize = isMobile ? (isLargeData ? 16 : 22) : (isLargeData ? 25 : 35); 
    const nodeData = rawData.map((d: any) => ({ ...d, radius: radiusSize }));

    const simulation = d3.forceSimulation(nodeData)
      .force('collide', d3.forceCollide().radius((d: any) => d.radius + 2).iterations(3))
      .force('x', d3.forceX().x((d: any) => newCenters[d[groupKey]]?.x || width / 2).strength(0.15))
      .force('y', d3.forceY().y((d: any) => newCenters[d[groupKey]]?.y || calculatedHeight / 2).strength(0.15))
      .force('bounds', () => {
        nodeData.forEach(d => {
          if (d.x < d.radius) d.x = d.radius;
          if (d.x > width - d.radius) d.x = width - d.radius;
          if (d.y < d.radius) d.y = d.radius;
          if (d.y > calculatedHeight - d.radius) d.y = calculatedHeight - d.radius;
        });
      })
      .on('tick', () => {
        setNodes([...nodeData]);
      });

    return () => {
      simulation.stop();
    };
  }, [rawData, groupKey, dimensions]);

  return (
    <main className="min-h-[100dvh] bg-[#f7f5f0] flex flex-col items-center pt-4 md:pt-8 relative overflow-hidden">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">教會人物網絡</h1>
      
      <div className="mb-2 md:mb-4 z-10 flex items-center gap-2 md:gap-3 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm border border-gray-200 text-sm md:text-base">
        <span className="text-gray-600 font-medium">分類方式：</span>
        <select 
          value={groupKey}
          onChange={(e: any) => {
            setGroupKey(e.target.value);
            setSelectedMember(null);
          }}
          className="bg-transparent text-gray-800 font-bold focus:outline-none cursor-pointer"
        >
          <option value="工作界別">工作界別</option>
          <option value="團契">團契</option>
          <option value="居住地區">居住地區</option>
        </select>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl flex-1 bg-white md:rounded-2xl shadow-sm border-y md:border border-gray-200 overflow-y-auto overflow-x-hidden"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 pointer-events-none">
            <p className="text-gray-500 text-lg">正在載入會友資料...</p>
          </div>
        )}

        {selectedMember && (
          <div className="fixed bottom-0 left-0 w-full md:absolute md:top-6 md:right-6 md:bottom-auto md:w-80 bg-white/95 backdrop-blur-md p-5 md:p-6 rounded-t-2xl md:rounded-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl border-t md:border border-gray-200 z-50 pointer-events-auto transition-transform">
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 font-bold text-xl"
            >
              ✕
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">{selectedMember['名稱'] || '無名氏'}</h2>
            
            <div className="space-y-2 md:space-y-3 text-sm text-gray-700 max-h-[40vh] md:max-h-none overflow-y-auto pb-4 md:pb-0">
              <p>💼 <span className="font-semibold text-gray-500">工作界別：</span> {selectedMember['工作界別'] || '-'}</p>
              <p>🙏 <span className="font-semibold text-gray-500">團契：</span> {selectedMember['團契'] || '-'}</p>
              <p>⛪ <span className="font-semibold text-gray-500">返屯門堂年份：</span> {selectedMember['返屯門堂年份'] || '-'}</p>
              <p>💧 <span className="font-semibold text-gray-500">受浸年份：</span> {selectedMember['受浸年份'] || '-'}</p>
              <p>🏫 <span className="font-semibold text-gray-500">中學：</span> {selectedMember['中學'] || '-'}</p>
              <p>🎓 <span className="font-semibold text-gray-500">大專 / 大學：</span> {selectedMember['大專 / 大學'] || '-'}</p>
              <p>📍 <span className="font-semibold text-gray-500">居住地區：</span> {selectedMember['居住地區'] || '-'}</p>
            </div>
          </div>
        )}

        <svg width="100%" height={svgHeight} className="z-0 relative">
          <rect width="100%" height="100%" fill="transparent" onClick={() => setSelectedMember(null)} />
          
          {nodes.map((node: any, index: number) => {
            const categoryIndex = categories.indexOf(node[groupKey]);
            const bubbleColor = categoryIndex !== -1 ? colorPalette[categoryIndex % colorPalette.length] : '#ccc';
            const isSelected = selectedMember?.['名稱'] === node['名稱'];
            const isLargeData = rawData.length > 80;

            return (
              <g key={node.id || `node-${index}`} transform={`translate(${node.x || 0}, ${node.y || 0})`}>
                <circle
                  r={node.radius}
                  fill={bubbleColor}
                  stroke={isSelected ? '#333' : '#fff'}
                  strokeWidth={isSelected ? "4" : "2"}
                  className="cursor-pointer hover:brightness-90 transition-all duration-200"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    setSelectedMember(node);
                  }}
                />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fontSize={dimensions.width < 768 ? (isLargeData ? "9px" : "11px") : (isLargeData ? "12px" : "14px")}
                  fontWeight="500"
                  fill="white"
                  className="pointer-events-none"
                >
                  {node['名稱'] || '無名氏'}
                </text>
              </g>
            );
          })}

          {categories.map((category: string) => {
            const xPos = centers[category]?.x;
            const yPos = centers[category]?.y - (dimensions.width < 768 ? 75 : 100); 
            
            return (
              <g key={category} transform={`translate(${xPos}, ${yPos})`} className="pointer-events-none">
                <text 
                  textAnchor="middle" 
                  className="text-[14px] md:text-xl font-bold fill-white stroke-white opacity-80"
                  strokeWidth="6"
                  strokeLinejoin="round"
                >
                  {category}
                </text>
                
                <text 
                  textAnchor="middle" 
                  className="text-[14px] md:text-xl font-bold fill-gray-700"
                >
                  {category}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </main>
  );
}