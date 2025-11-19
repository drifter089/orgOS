"use client";

import { useMemo, useRef } from "react";

import { Canvas, useFrame } from "@react-three/fiber";
import { type Group, type Mesh } from "three";

interface CubeProps {
  position: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
  color?: string;
}

function AnimatedCube({
  position,
  scale = 1,
  rotationSpeed = 1,
  color = "#6366f1",
}: CubeProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01 * rotationSpeed;
      meshRef.current.rotation.y += 0.015 * rotationSpeed;
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function CubeCluster({ isOpen }: { isOpen: boolean }) {
  const groupRef = useRef<Group>(null);

  const cubes = useMemo(
    () => [
      {
        position: [0, 0, 0] as [number, number, number],
        scale: 0.8,
        rotationSpeed: 1,
        color: "#6366f1",
      },
      {
        position: [0.3, 0.2, -0.2] as [number, number, number],
        scale: 0.5,
        rotationSpeed: 1.5,
        color: "#8b5cf6",
      },
      {
        position: [-0.25, -0.15, 0.1] as [number, number, number],
        scale: 0.4,
        rotationSpeed: 2,
        color: "#a855f7",
      },
    ],
    [],
  );

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {cubes.map((cube, index) => (
        <AnimatedCube
          key={index}
          position={cube.position}
          scale={isOpen ? cube.scale * 1.2 : cube.scale}
          rotationSpeed={isOpen ? cube.rotationSpeed * 1.5 : cube.rotationSpeed}
          color={cube.color}
        />
      ))}
    </group>
  );
}

interface NavRobotIndicatorProps {
  isOpen: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

export function NavRobotIndicator({
  isOpen,
  onHover,
  onLeave,
  onClick,
}: NavRobotIndicatorProps) {
  return (
    <div
      className="fixed top-4 left-4 z-[60] h-12 w-12 cursor-pointer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.5}
          color="#8b5cf6"
        />
        <CubeCluster isOpen={isOpen} />
      </Canvas>
    </div>
  );
}
