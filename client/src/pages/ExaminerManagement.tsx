import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, Edit2, Power, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ExaminerManagement() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { data: user } = trpc.auth.me.useQuery();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    title: "",
    department: "",
    bio: "",
    researchFocus: "",
    maxSupervisions: 5,
  });

  // Redirect if not superadmin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">{t.common.forbidden}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t.common.accessDenied}</p>
          <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
            {t.common.backHome}
          </Button>
        </Card>
      </div>
    );
  }

  const { data: examiners, isLoading, refetch } = trpc.superadmin.listExaminers.useQuery({});
  const updateMutation = trpc.superadmin.updateExaminerProfile.useMutation({
    onSuccess: () => {
      toast.success(t.superadmin.profileUpdated);
      setEditingId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || t.common.error);
    },
  });
  const toggleMutation = trpc.superadmin.toggleExaminerStatus.useMutation({
    onSuccess: () => {
      toast.success(t.superadmin.statusUpdated);
      setConfirmToggleId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || t.common.error);
    },
  });

  const handleEdit = (examiner: any) => {
    setEditingId(examiner.id);
    setEditData({
      title: examiner.title || "",
      department: examiner.department || "",
      bio: examiner.bio || "",
      researchFocus: examiner.researchFocus || "",
      maxSupervisions: examiner.maxSupervisions || 5,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      examinerId: editingId,
      ...editData,
    });
  };

  const handleToggleStatus = (examinerId: number, currentStatus: number | boolean) => {
    const isCurrentlyActive = currentStatus === 1 || currentStatus === true;
    toggleMutation.mutate({
      examinerId,
      isActive: !isCurrentlyActive,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/superadmin")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t.superadmin.examinerManagement}</h1>
            <p className="text-sm text-muted-foreground">{t.superadmin.manageExaminerProfiles}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !examiners || examiners.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t.superadmin.noExaminers}</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">{t.common.name}</th>
                  <th className="text-left p-3 font-semibold">{t.common.email}</th>
                  <th className="text-left p-3 font-semibold">{t.superadmin.department}</th>
                  <th className="text-left p-3 font-semibold">{t.superadmin.maxSupervisions}</th>
                  <th className="text-left p-3 font-semibold">{t.common.status}</th>
                  <th className="text-right p-3 font-semibold">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {examiners.map((examiner: any) => (
                  <tr key={examiner.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3">{examiner.name || "—"}</td>
                    <td className="p-3">{examiner.email}</td>
                    <td className="p-3">{examiner.department || "—"}</td>
                    <td className="p-3">{examiner.maxSupervisions}</td>
                    <td className="p-3">
                      <Badge variant={examiner.isActive ? "default" : "secondary"}>
                        {examiner.isActive ? t.common.active : t.common.inactive}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(examiner)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={examiner.isActive ? "destructive" : "default"}
                          onClick={() => setConfirmToggleId(examiner.id)}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editingId !== null} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.superadmin.editProfile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.superadmin.title}</label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Prof. Dr."
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.department}</label>
              <Input
                value={editData.department}
                onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                placeholder="Informatik"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.bio}</label>
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Kurze Biografie..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.researchFocus}</label>
              <Textarea
                value={editData.researchFocus}
                onChange={(e) => setEditData({ ...editData, researchFocus: e.target.value })}
                placeholder="Forschungsschwerpunkte..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.maxSupervisions}</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={editData.maxSupervisions}
                onChange={(e) => setEditData({ ...editData, maxSupervisions: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Modal */}
      <Dialog open={confirmToggleId !== null} onOpenChange={() => setConfirmToggleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.superadmin.confirmStatusChange}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.superadmin.statusChangeWarning}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmToggleId(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmToggleId !== null) {
                  const examiner = examiners?.find((e: any) => e.id === confirmToggleId);
                  if (examiner) {
                    handleToggleStatus(confirmToggleId, examiner.isActive);
                  }
                }
              }}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
