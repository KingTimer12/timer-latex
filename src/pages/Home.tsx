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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, FolderCode, LayoutTemplate } from "lucide-react";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const templates = [
  {
    id: "empty",
    label: "Vazio",
    description: "Documento em branco",
    icon: FileText,
  },
  {
    id: "article",
    label: "Artigo",
    description: "Estrutura para artigos científicos",
    icon: LayoutTemplate,
  },
] as const;

type TemplateId = (typeof templates)[number]["id"];

const createLaTeXSchema = z.object({
  name: z.string().min(1, "O nome do projeto é obrigatório"),
  template: z.enum(["empty", "article"]),
});

type CreateLaTeXValues = z.infer<typeof createLaTeXSchema>;

const CreateLaTeX = React.memo(() => {
  const [open, setOpen] = React.useState(false);

  const { control, handleSubmit, reset } = useForm<CreateLaTeXValues>({
    resolver: zodResolver(createLaTeXSchema),
    defaultValues: { name: "", template: "empty" },
  });

  function onSubmit(data: CreateLaTeXValues) {
    console.log(data);
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
        <Button>Criar LaTeX</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto LaTeX</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar seu projeto.
          </DialogDescription>
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
                    placeholder="Meu artigo"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

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
                          onClick={() => field.onChange(tpl.id as TemplateId)}
                          className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            selected
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-border bg-transparent hover:bg-muted/50"
                          }`}
                        >
                          <div
                            className={`rounded-md p-1.5 ${selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tpl.label}</p>
                            <p className="text-muted-foreground text-xs">
                              {tpl.description}
                            </p>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
  return (
    <main className="flex flex-col h-full bg-background">
      <TitleBar />
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderCode />
          </EmptyMedia>
          <EmptyTitle>Nenhum projeto ainda</EmptyTitle>
          <EmptyDescription>
            Crie ou importe seus projetos LaTeX e comece a escrever com estilo
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <CreateLaTeX />
          <Button variant="outline">Importar LaTeX</Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
