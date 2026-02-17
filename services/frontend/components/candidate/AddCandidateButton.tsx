"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import CreateCandidateDialog from "./AddCandidateForm";

export function AddCandidateButton(){
  const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
      <div className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700 transition">
        Create Employee
        </div>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>Create a new employee</DialogTitle>
        </DialogHeader>
        <CreateCandidateDialog setOpenAction={setOpen}/>
      </DialogContent>
    </Dialog>
    )
};