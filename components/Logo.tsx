export default function Logo() {
  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mint-700 text-[27px] font-black leading-none text-white shadow-[0_10px_24px_rgba(0,128,105,.14)]">S</div>
      <div className="text-[30px] font-black tracking-[-.045em]">
        Split<span className="text-mint-400 dark:text-mint-300">well</span>
      </div>
    </div>
  );
}
