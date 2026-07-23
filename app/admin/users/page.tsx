import { redirect } from 'next/navigation';

/** Legacy path — clientes viven en /admin/clients */
export default function UsersRedirectPage() {
  redirect('/admin/clients');
}
