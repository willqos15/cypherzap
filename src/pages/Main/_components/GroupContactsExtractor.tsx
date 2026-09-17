import {
    AlertCircle,
    RefreshCw,
    Search,
    Users,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "../../../components/ui/input";
import { ExportGroupButton } from "./ExportGroupButton";

type WhatsAppGroup = {
    id: string;
    title: string;
};

export function GroupContactsExtractor() {
    const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState("");

    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState("");

    const containerRef =
        useRef<HTMLDivElement>(null);

    const selectedGroup = groups.find(
        (group) => group.id === selectedGroupId
    );

    const isAllGroupsSelected = selectedGroupId === "ALL";

    const filteredGroups = groups.filter((group) =>
        group.title
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (
            event: MouseEvent
        ) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    const handleSearchGroups = async () => {
        try {
            setIsSearching(true);
            setError("");
            setSelectedGroupId("");
            setSearch("");
            setIsOpen(false);

            const result =
                await window.whatsapp.getWhatsAppGroups();

            setGroups(result);
        } catch (error) {
            console.error(error);
            setError(
                "Não foi possível buscar os grupos."
            );
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setSearch(event.target.value);
        setSelectedGroupId("");
        setIsOpen(true);
    };

    const handleSelectGroup = (
        group: WhatsAppGroup
    ) => {
        setSelectedGroupId(group.id);
        setSearch(group.title);
        setIsOpen(false);
        setError("");
    };

    const handleClear = () => {
        setSearch("");
        setSelectedGroupId("");
        setIsOpen(false);
    };

    return (
        <>
            <section className="bg-white p-4 flex w-full">


                <div className="flex w-full gap-10">
                    <div className="flex w-full mx-4 flex-col gap-4 rounded-lg border-2 border-gray-300 p-4">
                        <h2 className="text-lg font-semibold">
                            Extrair contatos de grupos
                        </h2>

                        <div className="flex gap-4 items-center">

                            {groups.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={
                                        handleSearchGroups
                                    }
                                    disabled={isSearching}
                                    className="flex w-fit items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Search className="h-4 w-4" />

                                    {isSearching
                                        ? "Buscando..."
                                        : "Buscar grupos"}
                                </button>
                            ) : (
                                <div
                                    ref={containerRef}
                                    className="flex items-center gap-2"
                                >
                                    <div className="relative w-80">
                                        <Input
                                            value={search}
                                            placeholder="Pesquisar grupo"
                                            onChange={
                                                handleInputChange
                                            }
                                            onFocus={() =>
                                                setIsOpen(true)
                                            }
                                            className="pr-9"
                                        />

                                        {search && (
                                            <button
                                                type="button"
                                                onClick={
                                                    handleClear
                                                }
                                                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded hover:bg-gray-100"
                                            >
                                                <X className="h-4 w-4 text-gray-500" />
                                            </button>
                                        )}

                                        {isOpen && (
                                            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border-2 border-gray-300 bg-white">

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedGroupId("ALL");
                                                        setSearch("Todos os grupos");
                                                        setIsOpen(false);
                                                        setError("");
                                                    }}
                                                    className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm font-medium hover:bg-gray-100"
                                                >
                                                    <Users className="h-4 w-4 shrink-0 text-gray-500" />

                                                    <span className="truncate">
                                                        Todos os grupos
                                                    </span>
                                                </button>

                                                {filteredGroups.length > 0 ? (
                                                    filteredGroups.map(
                                                        (group) => (
                                                            <button
                                                                key={
                                                                    group.id
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    handleSelectGroup(
                                                                        group
                                                                    )
                                                                }
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                                                            >
                                                                <Users className="h-4 w-4 shrink-0 text-gray-500" />

                                                                <span className="truncate">
                                                                    {
                                                                        group.title
                                                                    }
                                                                </span>
                                                            </button>
                                                        )
                                                    )
                                                ) : (
                                                    <div className="px-3 py-3 text-sm text-gray-500">
                                                        Nenhum grupo encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            handleSearchGroups
                                        }
                                        disabled={isSearching}
                                        title="Atualizar grupos"
                                        className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <RefreshCw
                                            className={`h-4 w-4 ${isSearching
                                                ? "animate-spin"
                                                : ""
                                                }`}
                                        />
                                    </button>



                                </div>
                            )}
                        </div>

                        {(selectedGroup || isAllGroupsSelected) && groups.length > 0 && (
                            <ExportGroupButton
                                groupId={isAllGroupsSelected ? "ALL" : selectedGroup!.id}
                                groupTitle={
                                    isAllGroupsSelected
                                        ? "Todos os grupos"
                                        : selectedGroup!.title
                                }
                            />
                        )}

                        {error && (
                            <span className="text-sm text-red-600">
                                {error}
                            </span>
                        )}

                        <div className="bg-yellow-100 rounded-xl p-2 flex gap-2 items-center text-sm">
                            <AlertCircle size={20} /> Alguns números podem não ser exportados, pois o WhatsApp pode não disponibilizá-los.
                        </div>
                    </div>
                </div>
            </section>

            <hr />
        </>
    );
}