import React from "react";
import _d3data from "./countries-110m.json";
import { geoPath, GeoSphere } from "d3-geo";
import { geoMiller } from "d3-geo-projection";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const width = 1200;
const outline: GeoSphere = { type: "Sphere" };
const d3data = _d3data as unknown as Topology;

const geographies = feature(
  d3data,
  d3data.objects["countries"] as GeometryCollection,
).features;

type LongitudeInfoProps = {
  title: string;
  longitude: number;
  set?: (longitude: number) => void;
};

function computeSolarTime(longitude: number): [number, number] {
  const solarTime = (longitude / 15 + 12) % 24;
  const hours = Math.floor(solarTime);
  const minutes = Math.floor((solarTime - hours) * 60);
  return [hours, minutes];
}

function formatSolarTime([hours, minutes]: [number, number]): string {
  const hS = hours.toString().padStart(2, "0");
  const mS = minutes.toString().padStart(2, "0");
  return `${hS}:${mS}`;
}

function computeOffsetMinutes(longitude: number) {
  return 4 * longitude; // x / 15 * 60
}

function LongitudeInfo({ longitude, title, set }: LongitudeInfoProps) {
  return (
    <div>
      <div>
        {title}:
        {set ? (
          <input
            type="number"
            value={longitude}
            onChange={(e) => set(Number(e.target.value))}
          />
        ) : (
          <>{longitude.toFixed(2)}</>
        )}
        &nbsp;deg
      </div>
      {set ? (
        <input
          type="range"
          min={-180}
          max={180}
          step={0.1}
          value={longitude}
          onChange={(e) => set(Number(e.target.value))}
        />
      ) : null}
      <div>
        Solar time: {formatSolarTime(computeSolarTime(longitude))}
        <br />
        Offset: {computeOffsetMinutes(longitude).toFixed(2)}
        &nbsp;minutes
      </div>
    </div>
  );
}

function App() {
  const [longitude, setLongitude] = React.useState(0);
  const [mouseLongitude, setMouseLongitude] = React.useState<
    number | undefined
  >(undefined);
  const { projection, height } = React.useMemo(() => {
    // Adapted from https://observablehq.com/@d3/world-map-svg
    const projection = geoMiller();
    const [[x0, y0], [x1, y1]] = geoPath(
      projection.fitWidth(width, outline),
    ).bounds(outline);
    const height = Math.ceil(y1 - y0);
    const l = Math.min(Math.ceil(x1 - x0), height);
    projection.scale((projection.scale() * (l - 1)) / l).precision(0.2);
    return { projection, height };
  }, []);

  const projectedGeographies = React.useMemo(() => {
    const projector = geoPath().projection(projection);
    return geographies.map((d, i) => (
      <path
        key={`path-${i}`}
        d={projector(d) ?? undefined}
        fill={`rgba(38, 50, 56)`}
        stroke="#FFFFFF"
        strokeWidth={0.5}
      />
    ));
  }, [projection]);
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = projection.invert?.([x, y]);
      if (coords) {
        setMouseLongitude(parseFloat(coords[0].toFixed(3)));
      }
    },
    [projection],
  );
  const longitudeProj = projection([longitude, 0])?.[0];
  const mouseLongitudeProj = mouseLongitude
    ? projection([mouseLongitude, 0])?.[0]
    : undefined;

  return (
    <main>
      <div>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ border: "1px solid black" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMouseLongitude(undefined)}
          onClick={() => mouseLongitude && setLongitude(mouseLongitude)}
        >
          <g className="countries">{projectedGeographies}</g>
          {longitudeProj ? (
            <line
              x1={longitudeProj}
              y1={0}
              x2={longitudeProj}
              y2={height}
              stroke="red"
            />
          ) : null}
          {mouseLongitudeProj ? (
            <line
              x1={mouseLongitudeProj}
              y1={0}
              x2={mouseLongitudeProj}
              y2={height}
              stroke="orange"
              opacity={0.5}
            />
          ) : null}
        </svg>
      </div>
      <div style={{ minWidth: "20em" }}>
        <LongitudeInfo
          title="Longitude"
          longitude={longitude}
          set={setLongitude}
        />
        {mouseLongitude !== undefined ? (
          <>
            <br />
            <LongitudeInfo
              title="Longitude at Cursor"
              longitude={mouseLongitude}
            />
          </>
        ) : null}
        <br />
        Map data:{" "}
        <a href="https://github.com/topojson/world-atlas">
          topojson/world-atlas
        </a>
      </div>
    </main>
  );
}

export default App;
