export function setupClientDelete() {
    const deleteBtn = document.getElementById("delete-client") as HTMLButtonElement | null;
    const modal = document.getElementById("delete-modal") as HTMLDivElement | null;
    const cancelBtn = document.getElementById("cancel-delete") as HTMLButtonElement | null;
    const confirmBtn = document.getElementById("confirm-delete") as HTMLButtonElement | null;

    if (!deleteBtn || !modal || !cancelBtn || !confirmBtn) {
        return;
    }

    const clientId = confirmBtn.dataset.clientId;

    const openModal = () => {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    };

    const closeModal = () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    };

    deleteBtn.addEventListener("click", openModal);
    cancelBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    confirmBtn.addEventListener("click", async () => {
        if (!clientId) {
            alert("No se encontró el ID del cliente");
            return;
        }

        try {
            confirmBtn.textContent = "Eliminando...";
            confirmBtn.disabled = true;

            const res = await fetch(`/api/clients/${clientId}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                },
            });

            let data: any = null;
            const contentType = res.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
                data = await res.json();
            }

            if (!res.ok) {
                alert(data?.error || "No se pudo eliminar el cliente");
                confirmBtn.textContent = "Eliminar cliente";
                confirmBtn.disabled = false;
                return;
            }

            window.location.href = "/clients";
        } catch (error) {
            console.error("Error eliminando cliente:", error);
            alert("Ocurrió un error eliminando el cliente");
            confirmBtn.textContent = "Eliminar cliente";
            confirmBtn.disabled = false;
        }
    });
}