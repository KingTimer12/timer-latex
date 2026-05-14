import TitleBar from "@/components/title-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useContentDataStore } from "@/hook/content-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoke } from "@tauri-apps/api/core";
import { FileText, FolderCode, LayoutTemplate, Presentation, StickyNote } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const latexTemplates = [
  { id: "empty", label: "Vazio", description: "Documento em branco", icon: FileText },
  { id: "simple", label: "Simples", description: "Estrutura básica LaTeX", icon: FolderCode },
  { id: "article", label: "Artigo", description: "Artigo científico (ABNT)", icon: LayoutTemplate },
] as const;

const quarkdownTemplates = [
  { id: "empty", label: "Vazio", description: "Documento em branco", icon: StickyNote },
  { id: "document", label: "Documento", description: "Documento paginado", icon: FileText },
  { id: "slides", label: "Slides", description: "Apresentação de slides", icon: Presentation },
] as const;

const createSchema = z.object({
  name: z.string().min(1, "O nome do projeto é obrigatório"),
  template: z.string(),
  projectType: z.enum(["latex", "quarkdown"]),
});

type CreateValues = z.infer<typeof createSchema>;

interface Project {
  name: string;
  type: string;
}

const CreateProject = React.memo(({ javaAvailable }: { javaAvailable: boolean }) => {
  const setContentData = useContentDataStore((s) => s.setContentData);
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const { control, handleSubmit, reset, watch } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", template: "empty", projectType: "latex" },
  });

  const selectedType = watch("projectType");
  const templates = selectedType === "quarkdown" ? quarkdownTemplates : latexTemplates;

  async function onSubmit(data: CreateValues) {
    const content: string = await invoke("create_project", {
      title: data.name,
      template: data.template,
      projectType: data.projectType,
    });
    setContentData(content);
    const ext = data.projectType === "quarkdown" ? "qd" : "tex";
    navigate("/" + encodeURIComponent(`${data.name}.${ext}`));
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>Criar projeto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>Preencha as informações para criar seu projeto.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
          <FieldGroup>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nome do projeto</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Meu documento"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Tipo de projeto</FieldLabel>
              <Controller
                control={control}
                name="projectType"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange("latex")}
                      className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        field.value === "latex"
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-border bg-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className={`rounded-md p-1.5 ${field.value === "latex" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">LaTeX</p>
                        <p className="text-muted-foreground text-xs">Tipografia profissional</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={!javaAvailable}
                      onClick={() => javaAvailable && field.onChange("quarkdown")}
                      title={!javaAvailable ? "Java não encontrado no sistema. Instale o Java para usar Quarkdown." : undefined}
                      className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        !javaAvailable
                          ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                          : field.value === "quarkdown"
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-border bg-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className={`rounded-md p-1.5 ${field.value === "quarkdown" && javaAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <LayoutTemplate className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Quarkdown</p>
                        <p className="text-muted-foreground text-xs">
                          {javaAvailable ? "Markdown moderno" : "Requer Java"}
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              />
            </Field>

            <Field>
              <FieldLabel>Template</FieldLabel>
              <Controller
                control={control}
                name="template"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((tpl) => {
                      const Icon = tpl.icon;
                      const selected = field.value === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => field.onChange(tpl.id)}
                          className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selected
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-border bg-transparent hover:bg-muted/50"
                          }`}
                        >
                          <div className={`rounded-md p-1.5 ${selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tpl.label}</p>
                            <p className="text-muted-foreground text-xs">{tpl.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar projeto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [javaAvailable, setJavaAvailable] = useState(false);

  useEffect(() => {
    invoke<Project[]>("list_projects").then(setProjects);
    invoke<boolean>("check_java").then(setJavaAvailable);
  }, []);

  const onClick = useCallback(
    (project: Project) => {
      navigate("/" + encodeURIComponent(project.name));
    },
    [navigate],
  );

  return (
    <main className="flex flex-col h-full bg-background">
      <TitleBar />
      {projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderCode />
            </EmptyMedia>
            <EmptyTitle>Nenhum projeto ainda</EmptyTitle>
            <EmptyDescription>Crie seus projetos LaTeX ou Quarkdown e comece a escrever</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <CreateProject javaAvailable={javaAvailable} />
            <Button variant="outline">Importar</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          <div className="flex justify-end gap-2 mb-2">
            <CreateProject javaAvailable={javaAvailable} />
            <Button variant="outline">Importar</Button>
          </div>
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.name}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => onClick(project)}
                >
                  <FileText className="size-4" />
                  {project.name}
                  {project.type === "qd" && (
                    <span className="ml-auto text-xs text-muted-foreground font-mono">Quarkdown</span>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
