import { createFileRoute } from "@tanstack/react-router";
import { StudioApp } from "#/features/editor/StudioApp";

export const Route = createFileRoute("/")({ component: StudioApp });
