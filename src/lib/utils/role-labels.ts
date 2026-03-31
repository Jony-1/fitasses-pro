export function getRoleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Administrador";
    case "gym_manager":
      return "Gestor de gimnasio";
    case "trainer":
      return "Entrenador";
    case "client":
      return "Cliente";
    default:
      return role;
  }
}
