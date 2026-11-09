import { createFileRoute } from "@tanstack/react-router";
import { EditorApp } from "#/features/editor/EditorApp";

export const Route = createFileRoute("/editor")({ component: EditorApp });
