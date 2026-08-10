function Input({
    label,
    type = "text",
    name,
    placeholder,
    value,
    onchange,
    icon,
    className = "border rounded-lg"
}) {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div className={`flex items-center px-4 ${className}`}>
                <input
                    type={type}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onchange}
                    className="w-full bg-transparent py-3 outline-none text-sm text-gray-700 placeholder-gray-400"
                />
                {icon && <span className="text-gray-500 ml-2">{icon}</span>}
            </div>
        </div>
    );
}
export default Input;