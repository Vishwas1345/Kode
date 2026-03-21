import { ProjectForm } from "@/client/modules/home/components/project-form";
import { ProjectsList } from "@/client/modules/home/components/projects-list";

const Page = () => {
  return (
    <div className="flex flex-col max-w-[1100px] mx-auto w-full">
      <section className="flex flex-col items-center justify-center space-y-8 py-[12vh] md:py-[18vh]">
        <div className="space-y-6 text-center w-full flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Build your AI app with <span className="bg-gradient-to-r from-[#00FF88] to-[#00CC6A] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,136,0.5)]">Kode</span>
          </h1>
          <p className="text-lg text-[#A0A0A0] max-w-[700px] mx-auto font-normal leading-relaxed">
            Experience the premium AI Website Builder. Generate complete, structured React applications instantly.
          </p>
        </div>
        <div className="w-full pt-6">
          <ProjectForm />
        </div>
      </section>

      <div className="mt-8 border-t border-[#1F1F1F] pt-12">
        <ProjectsList />
      </div>
    </div>
  );
};

export default Page;
