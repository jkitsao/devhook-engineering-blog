import Container from "@/app/_components/container";
import { EXAMPLE_PATH } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-neutral-50   dark:bg-neutral-800">
     <Container>
  <div className="py-28 flex flex-col lg:flex-row items-center  text-gray-100">
    <h3 className="text-4xl lg:text-[2.5rem] font-bold tracking-tighter leading-tight text-center lg:text-left mb-10 lg:mb-0 lg:pr-4 lg:w-1/2">
      Your Events, Supercharged
    </h3>
    <div className="flex flex-col lg:flex-row justify-center items-center lg:pl-4 lg:w-1/2">
      <a
        href="https://devhooks.live/ingest"
        className="mx-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-12 lg:px-8 rounded-lg duration-200 transition-colors mb-6 lg:mb-0 text-center"
      >
        Try Devhooks Ingest
      </a>
      {/* <a
        href={`https://github.com/vercel/next.js/tree/canary/examples/${EXAMPLE_PATH}`}
        className="mx-3 font-bold hover:underline text-yellow-400"
      >
        View Example on GitHub
      </a> */}
    </div>
  </div>
</Container>

    </footer>
  );
}

export default Footer;
