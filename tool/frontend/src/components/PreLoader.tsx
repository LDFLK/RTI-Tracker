interface PreLoaderProps {
    message?: string;
}

export function PreLoader({ message = "Loading..." }: PreLoaderProps) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-8 bg-gray-50/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 text-sm">{message}</p>
        </div>
    );
}