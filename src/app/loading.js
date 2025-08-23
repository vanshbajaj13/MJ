// app/loading.js
export default function Loading() {
  return (
    <div className="flex space-x-2 justify-center items-center bg-white h-[91vh]">
      {[0.3, 0.15, 0].map((delay, i) => (
        <div key={i}>
          {/* Ball */}
          <div
            className={`h-8 w-8 bg-black rounded-full animate-bounce`}
            style={{ animationDelay: `-${delay}s` }}
          ></div>

          <div
            className="w-6 h-1 rounded-full bg-black opacity-80 blur-sm animate-bounce"
            style={{ animationDelay: `-${delay}s` }}
          ></div>
          {/* Shadow */}
        </div>
      ))}
    </div>
  );
}
