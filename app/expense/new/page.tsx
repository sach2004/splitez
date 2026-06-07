import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExpenseForm from "@/components/ExpenseForm";
export default async function NewExpense(){ const session=await getServerSession(authOptions); const userId=(session?.user as any)?.id; const groups=userId?await prisma.group.findMany({where:{members:{some:{userId}}},include:{members:true},orderBy:{createdAt:'desc'}}):await prisma.group.findMany({include:{members:true},take:10,orderBy:{createdAt:'desc'}}); return <ExpenseForm groups={groups.map(g=>({id:g.id,name:g.name,members:g.members.map(m=>({id:m.id,name:m.name}))}))}/> }
