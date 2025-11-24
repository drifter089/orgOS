"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BarChart3, Users } from "lucide-react";
import { useTransitionRouter } from "next-transition-router";

import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";

// Register GSAP plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface NavigationCardProps {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
}

function NavigationCard({
  title,
  icon,
  onClick,
  delay = 0,
}: NavigationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!cardRef.current || !iconRef.current || !titleRef.current) return;

    const card = cardRef.current;
    const iconEl = iconRef.current;
    const titleEl = titleRef.current;

    gsap.from(card, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      delay,
      ease: "power3.out",
    });

    ScrollTrigger.create({
      trigger: card,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(
          iconEl,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: "back.out(1.7)",
          },
        );

        gsap.fromTo(
          titleEl,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: 0.1,
            ease: "power2.out",
          },
        );
      },
    });

    const handleMouseEnter = () => {
      gsap.to(iconEl, {
        scale: 1.15,
        rotation: 5,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(titleEl, {
        y: -4,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(iconEl, {
        scale: 1,
        rotation: 0,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(titleEl, {
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [delay]);

  return (
    <div ref={cardRef} onClick={onClick} className="cursor-pointer">
      <Card className="group hover:border-primary relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl">
        <div className="from-primary/5 to-primary/10 absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-6 p-12">
          <div
            ref={iconRef}
            className="bg-primary/10 group-hover:bg-primary/20 rounded-full p-8 transition-colors duration-300"
          >
            {icon}
          </div>
          <h3
            ref={titleRef}
            className="group-hover:text-primary text-center text-4xl font-bold tracking-tight transition-colors duration-300"
          >
            {title}
          </h3>
        </div>
      </Card>
    </div>
  );
}

export function NavigationCards() {
  const router = useTransitionRouter();
  const { data: teams, isLoading } = api.team.getAll.useQuery();

  const handleRolesClick = () => {
    if (teams && teams.length > 0) {
      const firstTeam = teams[0];
      if (firstTeam && !("isPending" in firstTeam)) {
        router.push(`/teams/${firstTeam.id}`);
      }
    }
  };

  const handleKPIsClick = () => {
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="grid gap-8 sm:grid-cols-2">
        <Card className="bg-muted/50 min-h-[280px] animate-pulse" />
        <Card className="bg-muted/50 min-h-[280px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <NavigationCard
        title="Roles"
        icon={<Users className="text-primary h-16 w-16" />}
        onClick={handleRolesClick}
        delay={0.1}
      />
      <NavigationCard
        title="KPIs"
        icon={<BarChart3 className="text-primary h-16 w-16" />}
        onClick={handleKPIsClick}
        delay={0.2}
      />
    </div>
  );
}
