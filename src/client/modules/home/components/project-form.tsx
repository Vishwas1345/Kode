"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import { Wand2Icon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/server/lib/utils";
import { useTRPC } from "@/server/trpc/client";
import { Button } from "@/client/components/ui/button";
import { Form, FormField } from "@/client/components/ui/form";

import { PROJECT_TEMPLATES } from "../constants";

const formSchema = z.object({
  value: z.string()
    .min(1, { message: "Value is required" })
    .max(10000, { message: "Value is too long" }),
})

export const ProjectForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const createProject = useMutation(trpc.projects.create.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(
        trpc.projects.getMany.queryOptions(),
      );
      queryClient.invalidateQueries(
        trpc.usage.status.queryOptions(),
      );
      router.push(`/projects/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);

      if (error.data?.code === "UNAUTHORIZED") {
        clerk.openSignIn();
      }

      if (error.data?.code === "TOO_MANY_REQUESTS") {
        router.push("/pricing");
      }
    },
  }));

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createProject.mutateAsync({
      value: values.value,
    });
  };

  const onSelect = (value: string) => {
    form.setValue("value", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPending = createProject.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <section className="space-y-6 w-full max-w-4xl mx-auto">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "relative border border-[#1F1F1F] p-8 rounded-2xl bg-[#111111] shadow-2xl transition-all duration-300",
            isFocused ? "border-[#00FF88] shadow-[0_0_30px_rgba(0,255,136,0.15)]" : "hover:border-[#333333] hover:shadow-[0_0_20px_rgba(255,255,255,0.02)]"
          )}
        >
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                minRows={4}
                maxRows={10}
                className="resize-none border-none w-full outline-none bg-transparent text-gray-200 text-base placeholder:text-gray-500 font-normal leading-relaxed"
                placeholder="Describe the application you want to build..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-6 mt-4">
            <div className="hidden sm:flex text-sm text-[#555555] font-mono items-center gap-2">
              <SparklesIcon className="size-4 text-[#00FF88]/70" />
              <span>Be as descriptive as possible</span>
            </div>

            <Button
              type="submit"
              disabled={isButtonDisabled}
              className={cn(
                "w-full sm:w-auto px-8 h-12 font-semibold text-base bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black hover:shadow-[0_0_25px_rgba(0,255,136,0.5)] hover:scale-[1.02] active:scale-[0.98] rounded-xl shadow-[0_0_15px_rgba(0,255,136,0.2)] transition-all duration-300 cursor-pointer",
                isButtonDisabled && "opacity-50 pointer-events-none shadow-none grayscale"
              )}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2Icon className="size-5 mr-2" />
                  Generate Website
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-3 hidden md:flex pt-2">
          {PROJECT_TEMPLATES.map((template) => (
            <Button
              key={template.title}
              variant="outline"
              size="sm"
              className="bg-transparent border border-[#1F1F1F] text-[#A0A0A0] hover:text-[#FFFFFF] hover:border-[#00FF88] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,255,136,0.1)] transition-all duration-300 rounded-full px-5 py-2 h-auto text-sm font-medium"
              onClick={() => onSelect(template.prompt)}
            >
              <span className="mr-2 text-base">{template.emoji}</span> {template.title}
            </Button>
          ))}
        </div>
      </section>
    </Form>
  );
};
