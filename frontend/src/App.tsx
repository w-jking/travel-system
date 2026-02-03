import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  key: string;
  text: string;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type Employee = {
  employeeUuid: string;
  name: string;
  phone: string;
  department: string;
  position: string;
  role?: {
    name?: string;
    code?: string;
  };
};

type Customer = {
  customerUuid: string;
  name: string;
  contact: string;
  level: string;
  owner?: {
    name?: string;
  };
};

type CompanyAccount = {
  accountUuid: string;
  name: string;
  bankName?: string;
  accountNo?: string;
  status?: string;
  notes?: string;
};

type Order = {
  orderUuid: string;
  amount: number | string;
  status: string;
  payee?: string;
  orderedAt?: string;
  departureAt?: string | null;
  route?: string | null;
  companyAccount?: {
    name?: string;
  };
  customer?: {
    name?: string;
  };
  owner?: {
    name?: string;
  };
};

type FollowUp = {
  followUpUuid: string;
  followAt?: string;
  channel?: string;
  request?: string;
  result?: string;
  nextFollowAt?: string | null;
  customer?: {
    name?: string;
  };
  order?: {
    orderUuid?: string;
  };
  owner?: {
    name?: string;
  };
};

type AuditLog = {
  auditLogUuid: string;
  action: string;
  targetType?: string;
  targetUuid?: string;
  summary?: string;
  createdAt?: string;
  actor?: {
    name?: string;
    department?: string;
  };
};

type Alert = {
  alertUuid: string;
  ruleCode: string;
  summary: string;
  status: string;
  createdAt?: string;
  actor?: {
    name?: string;
    department?: string;
    position?: string;
  };
};

type ExportApproval = {
  exportApprovalUuid: string;
  scope: string;
  status: string;
  comment?: string | null;
  requestedAt?: string;
  reviewedAt?: string | null;
  requester?: {
    name?: string;
  };
  reviewer?: {
    name?: string;
  };
};

type OrderApproval = {
  orderApprovalUuid: string;
  status: string;
  comment?: string | null;
  requestedAt?: string;
  reviewedAt?: string | null;
  order?: {
    orderUuid?: string;
    amount?: number | string;
    status?: string;
    customer?: {
      name?: string;
    };
  };
  requester?: {
    name?: string;
  };
  reviewer?: {
    name?: string;
  };
};

type RefundApproval = {
  refundApprovalUuid: string;
  status: string;
  comment?: string | null;
  requestedAt?: string;
  reviewedAt?: string | null;
  order?: {
    orderUuid?: string;
    amount?: number | string;
    status?: string;
    customer?: {
      name?: string;
    };
  };
  requester?: {
    name?: string;
  };
  reviewer?: {
    name?: string;
  };
};

type BackupItem = {
  backupId: string;
  createdAt?: string;
  note?: string | null;
  size?: number;
  counts?: Record<string, number>;
};

type BackupList = {
  status?: {
    lastBackupAt?: string;
    lastDrillAt?: string;
  };
  retentionDays?: number;
  intervalDays?: number;
  items?: BackupItem[];
};

type ReportState<T> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};

type EmployeeReportItem = {
  employeeUuid: string;
  name: string;
  department: string;
  position: string;
  customerCount: number;
  orderCount: number;
  orderAmount: number;
  conversionRate: number;
  followUpCount: number;
};

type CustomerReportItem = {
  customerUuid: string;
  name: string;
  level: string;
  ownerUuid: string;
  amountSum: number;
  ordersCount: number;
  tripsCount: number;
  lastOrderedAt: string | null;
  regradeCount: number;
  lastRegradeAt: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const ORDER_STATUSES = ["待确认", "已收款", "已出团", "已完成", "已取消"];

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAccount, setRememberAccount] = useState(true);
  const [token, setToken] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [profile, setProfile] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [companyAccounts, setCompanyAccounts] = useState<CompanyAccount[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [backupData, setBackupData] = useState<BackupList | null>(null);
  const [exportApprovals, setExportApprovals] = useState<ExportApproval[]>([]);
  const [orderApprovals, setOrderApprovals] = useState<OrderApproval[]>([]);
  const [refundApprovals, setRefundApprovals] = useState<RefundApproval[]>([]);
  const [employeeReport, setEmployeeReport] = useState<ReportState<EmployeeReportItem>>({ items: [] });
  const [customerReport, setCustomerReport] = useState<ReportState<CustomerReportItem>>({ items: [] });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState({
    name: "",
    phone: "",
    department: "",
    position: "",
    role: ""
  });
  const [appliedEmployeeSearch, setAppliedEmployeeSearch] = useState({
    name: "",
    phone: "",
    department: "",
    position: "",
    role: ""
  });
  const [customerSearch, setCustomerSearch] = useState({
    name: "",
    contact: "",
    level: "",
    owner: ""
  });
  const [appliedCustomerSearch, setAppliedCustomerSearch] = useState({
    name: "",
    contact: "",
    level: "",
    owner: ""
  });
  const [orderSearch, setOrderSearch] = useState({
    customer: "",
    status: "",
    route: "",
    payee: "",
    orderUuid: ""
  });
  const [appliedOrderSearch, setAppliedOrderSearch] = useState({
    customer: "",
    status: "",
    route: "",
    payee: "",
    orderUuid: ""
  });
  const [followUpSearch, setFollowUpSearch] = useState({
    customer: "",
    channel: "",
    result: "",
    owner: "",
    orderUuid: ""
  });
  const [appliedFollowUpSearch, setAppliedFollowUpSearch] = useState({
    customer: "",
    channel: "",
    result: "",
    owner: "",
    orderUuid: ""
  });
  const [auditSearch, setAuditSearch] = useState({
    actor: "",
    department: "",
    action: "",
    targetType: "",
    targetUuid: ""
  });
  const [appliedAuditSearch, setAppliedAuditSearch] = useState({
    actor: "",
    department: "",
    action: "",
    targetType: "",
    targetUuid: ""
  });
  const [alertSearch, setAlertSearch] = useState({
    ruleCode: "",
    status: "",
    actor: ""
  });
  const [appliedAlertSearch, setAppliedAlertSearch] = useState({
    ruleCode: "",
    status: "",
    actor: ""
  });
  const [exportSearch, setExportSearch] = useState({
    scope: "",
    status: "",
    requester: "",
    reviewer: ""
  });
  const [appliedExportSearch, setAppliedExportSearch] = useState({
    scope: "",
    status: "",
    requester: "",
    reviewer: ""
  });
  const [reportSearch, setReportSearch] = useState({
    employeeName: "",
    employeeDepartment: "",
    employeePosition: "",
    customerName: "",
    customerLevel: ""
  });
  const [appliedReportSearch, setAppliedReportSearch] = useState({
    employeeName: "",
    employeeDepartment: "",
    employeePosition: "",
    customerName: "",
    customerLevel: ""
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    phone: "",
    department: "",
    position: "",
    roleCode: "",
    status: "",
    email: "",
    hiredAt: "",
    employeeNo: ""
  });
  const [employeeFormLoading, setEmployeeFormLoading] = useState(false);
  const [employeeFormError, setEmployeeFormError] = useState("");
  const [customerForm, setCustomerForm] = useState({
    name: "",
    contact: "",
    level: "",
    ownerUuid: "",
    idNumber: "",
    birthDate: "",
    preferences: "",
    notes: ""
  });
  const [customerFormLoading, setCustomerFormLoading] = useState(false);
  const [customerFormError, setCustomerFormError] = useState("");
  const [orderForm, setOrderForm] = useState({
    customerUuid: "",
    amount: "",
    payee: "",
    companyAccountUuid: "",
    status: "",
    ownerUuid: "",
    orderedAt: "",
    departureAt: "",
    route: "",
    attachment: "",
    notes: ""
  });
  const [orderFormLoading, setOrderFormLoading] = useState(false);
  const [orderFormError, setOrderFormError] = useState("");
  const [companyAccountForm, setCompanyAccountForm] = useState({
    name: "",
    bankName: "",
    accountNo: "",
    status: "启用",
    notes: ""
  });
  const [companyAccountFormLoading, setCompanyAccountFormLoading] = useState(false);
  const [companyAccountFormError, setCompanyAccountFormError] = useState("");
  const [followUpForm, setFollowUpForm] = useState({
    customerUuid: "",
    orderUuid: "",
    followAt: "",
    channel: "",
    request: "",
    result: "",
    nextFollowAt: "",
    attachment: ""
  });
  const [followUpFormLoading, setFollowUpFormLoading] = useState(false);
  const [followUpFormError, setFollowUpFormError] = useState("");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCompanyAccountForm, setShowCompanyAccountForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : ""
  }), [token]);

  const request = async <T,>(path: string, body?: unknown) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new Error("无法连接后端服务");
    }
    let data: ApiResponse<T> | null = null;
    try {
      data = (await res.json()) as ApiResponse<T>;
    } catch {
      if (!res.ok) {
        throw new Error("请求失败");
      }
      throw new Error("响应解析失败");
    }
    if (!res.ok || data?.code !== 200) {
      throw new Error(data?.message || "请求失败");
    }
    return data.data;
  };
  const confirmAction = (message: string) => window.confirm(message);

  const login = async () => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const data = await request<{ accessToken: string }>("/auth/login", { username, password });
      setToken(data.accessToken || "");
      setActiveKey("dashboard");
      if (rememberAccount) {
        localStorage.setItem("savedUsername", username);
      } else {
        localStorage.removeItem("savedUsername");
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setMenu([]);
    setActiveKey("");
    setEmployees([]);
    setCustomers([]);
    setOrders([]);
    setCompanyAccounts([]);
    setFollowUps([]);
    setAuditLogs([]);
    setAlerts([]);
    setBackupData(null);
    setExportApprovals([]);
    setOrderApprovals([]);
    setRefundApprovals([]);
    setEmployeeReport({ items: [] });
    setCustomerReport({ items: [] });
    setContentError("");
    setError("");
  };

  const loadMenu = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request<MenuItem[]>("/auth/menu");
      setMenu(data || []);
      if (!activeKey && data?.length) {
        setActiveKey(data[0].key);
      }
    } catch (err) {
      setMenu([]);
      setError(err instanceof Error ? err.message : "菜单获取失败");
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await request<Employee>("/auth/me");
      setProfile(data || null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("accessToken");
    if (saved) {
      setToken(saved);
    }
    const savedUsername = localStorage.getItem("savedUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberAccount(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("accessToken", token);
      loadMenu();
      loadProfile();
      return;
    }
    localStorage.removeItem("accessToken");
  }, [token]);

  useEffect(() => {
    if (!profile?.employeeUuid) {
      return;
    }
    setCustomerForm((prev) => (prev.ownerUuid ? prev : { ...prev, ownerUuid: profile.employeeUuid }));
    setOrderForm((prev) => (prev.ownerUuid ? prev : { ...prev, ownerUuid: profile.employeeUuid }));
  }, [profile?.employeeUuid]);

  const loadEmployees = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<Employee[]>("/employees/list");
      setEmployees(data || []);
    } catch (err) {
      setEmployees([]);
      setContentError(err instanceof Error ? err.message : "员工加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadCustomers = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<Customer[]>("/customers/list");
      setCustomers(data || []);
    } catch (err) {
      setCustomers([]);
      setContentError(err instanceof Error ? err.message : "客户加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadOrdersPanel = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const [ordersData, orderApprovalsData, refundApprovalsData, companyAccountsData] = await Promise.all([
        request<Order[]>("/orders/list"),
        request<OrderApproval[]>("/order-approvals/list", {}),
        request<RefundApproval[]>("/refund-approvals/list", {}),
        request<CompanyAccount[]>("/company-accounts/list", {})
      ]);
      setOrders(ordersData || []);
      setOrderApprovals(orderApprovalsData || []);
      setRefundApprovals(refundApprovalsData || []);
      setCompanyAccounts(companyAccountsData || []);
    } catch (err) {
      setOrders([]);
      setOrderApprovals([]);
      setRefundApprovals([]);
      setCompanyAccounts([]);
      setContentError(err instanceof Error ? err.message : "订单模块加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadOrdersOnly = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<Order[]>("/orders/list");
      setOrders(data || []);
    } catch (err) {
      setOrders([]);
      setContentError(err instanceof Error ? err.message : "订单加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadFollowUps = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<FollowUp[]>("/followups/list");
      setFollowUps(data || []);
    } catch (err) {
      setFollowUps([]);
      setContentError(err instanceof Error ? err.message : "回访加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<AuditLog[]>("/audit/list", {});
      setAuditLogs(data || []);
    } catch (err) {
      setAuditLogs([]);
      setContentError(err instanceof Error ? err.message : "审计日志加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadAlerts = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<Alert[]>("/alerts/list", {});
      setAlerts(data || []);
    } catch (err) {
      setAlerts([]);
      setContentError(err instanceof Error ? err.message : "异常预警加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const scanAlerts = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      await request<Alert[]>("/alerts/scan", {});
      const data = await request<Alert[]>("/alerts/list", {});
      setAlerts(data || []);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "异常预警扫描失败");
    } finally {
      setContentLoading(false);
    }
  };

  const resolveAlert = async (alertUuid: string) => {
    if (!confirmAction("确认将预警标记为已处理？")) {
      return;
    }
    setContentLoading(true);
    setContentError("");
    try {
      await request<Alert>("/alerts/resolve", { alertUuid });
      const data = await request<Alert[]>("/alerts/list", {});
      setAlerts(data || []);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "异常预警处理失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadExportApprovals = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<ExportApproval[]>("/export-approvals/list", {});
      setExportApprovals(data || []);
    } catch (err) {
      setExportApprovals([]);
      setContentError(err instanceof Error ? err.message : "导出审批加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const approveExportApproval = async (exportApprovalUuid: string) => {
    if (!confirmAction("确认通过该导出审批？")) {
      return;
    }
    setContentLoading(true);
    setContentError("");
    try {
      await request<ExportApproval>("/export-approvals/approve", { exportApprovalUuid });
      const data = await request<ExportApproval[]>("/export-approvals/list", {});
      setExportApprovals(data || []);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "导出审批通过失败");
    } finally {
      setContentLoading(false);
    }
  };

  const rejectExportApproval = async (exportApprovalUuid: string) => {
    if (!confirmAction("确认驳回该导出审批？")) {
      return;
    }
    setContentLoading(true);
    setContentError("");
    try {
      await request<ExportApproval>("/export-approvals/reject", { exportApprovalUuid });
      const data = await request<ExportApproval[]>("/export-approvals/list", {});
      setExportApprovals(data || []);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "导出审批驳回失败");
    } finally {
      setContentLoading(false);
    }
  };

  const loadBackups = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const data = await request<BackupList>("/backup/list", {});
      setBackupData(data || null);
    } catch (err) {
      setBackupData(null);
      setContentError(err instanceof Error ? err.message : "备份加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const runBackup = async () => {
    if (!confirmAction("确认执行备份？")) {
      return;
    }
    setContentLoading(true);
    setContentError("");
    try {
      await request("/backup/run", {});
      const data = await request<BackupList>("/backup/list", {});
      setBackupData(data || null);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "备份执行失败");
    } finally {
      setContentLoading(false);
    }
  };

  const drillBackup = async (backupId: string) => {
    if (!confirmAction("确认执行备份演练？")) {
      return;
    }
    setContentLoading(true);
    setContentError("");
    try {
      await request("/backup/restore", { backupId, dryRun: true });
      const data = await request<BackupList>("/backup/list", {});
      setBackupData(data || null);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "备份演练失败");
    } finally {
      setContentLoading(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirmAction("确认恢复该备份？")) {
      return;
    }
    setContentLoading(true);
    setContentError("");
    try {
      await request("/backup/restore", { backupId });
      const data = await request<BackupList>("/backup/list", {});
      setBackupData(data || null);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "备份恢复失败");
    } finally {
      setContentLoading(false);
    }
  };

  const normalizeReport = <T,>(data: T[] | { items?: T[]; total?: number; page?: number; pageSize?: number }) => {
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page: 1, pageSize: data.length };
    }
    return {
      items: data.items ?? [],
      total: data.total ?? data.items?.length ?? 0,
      page: data.page,
      pageSize: data.pageSize
    };
  };

  const loadReports = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const [employeeData, customerData] = await Promise.all([
        request<ReportState<EmployeeReportItem> | EmployeeReportItem[]>("/employees/report-performance", {}),
        request<ReportState<CustomerReportItem> | CustomerReportItem[]>("/customers/report-value", {})
      ]);
      setEmployeeReport(normalizeReport(employeeData));
      setCustomerReport(normalizeReport(customerData));
    } catch (err) {
      setEmployeeReport({ items: [] });
      setCustomerReport({ items: [] });
      setContentError(err instanceof Error ? err.message : "报表加载失败");
    } finally {
      setContentLoading(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };
  const formatCounts = (counts?: Record<string, number>) => {
    if (!counts) {
      return "-";
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return "-";
    }
    return entries.map(([key, value]) => `${key}:${value}`).join("，");
  };
  const countLabel = (filtered: number, total: number, unit: string) => {
    if (filtered === total) {
      return `共 ${total} ${unit}`;
    }
    return `共 ${filtered} / ${total} ${unit}`;
  };
  const emptyLabel = (filtered: number, total: number, emptyText: string) => {
    if (total === 0) {
      return emptyText;
    }
    if (filtered === 0) {
      return "没有匹配结果";
    }
    return "";
  };

  const normalizeText = (value?: string | number | null) => `${value ?? ""}`.toLowerCase();
  const rangeStart = appliedStartDate ? new Date(`${appliedStartDate}T00:00:00`) : null;
  const rangeEnd = appliedEndDate ? new Date(`${appliedEndDate}T23:59:59.999`) : null;
  const normalizeDate = (value?: string | null) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  };
  const matchesText = (value: string | number | null | undefined, keyword: string) => {
    if (!keyword.trim()) {
      return true;
    }
    return normalizeText(value).includes(normalizeText(keyword));
  };
  const matchesExact = (value: string | number | null | undefined, keyword: string) => {
    if (!keyword.trim()) {
      return true;
    }
    return normalizeText(value) === normalizeText(keyword);
  };
  const matchesDateRange = (values: Array<string | null | undefined>) => {
    if (!rangeStart && !rangeEnd) {
      return true;
    }
    return values.some((value) => {
      const date = normalizeDate(value);
      if (!date) {
        return false;
      }
      if (rangeStart && date < rangeStart) {
        return false;
      }
      if (rangeEnd && date > rangeEnd) {
        return false;
      }
      return true;
    });
  };
  const applySearch = () => {
    if (activeKey === "employees") {
      setAppliedEmployeeSearch(employeeSearch);
    }
    if (activeKey === "customers") {
      setAppliedCustomerSearch(customerSearch);
    }
    if (activeKey === "orders") {
      setAppliedOrderSearch(orderSearch);
    }
    if (activeKey === "followups") {
      setAppliedFollowUpSearch(followUpSearch);
    }
    if (activeKey === "audit") {
      setAppliedAuditSearch(auditSearch);
    }
    if (activeKey === "alerts") {
      setAppliedAlertSearch(alertSearch);
    }
    if (activeKey === "export-approvals") {
      setAppliedExportSearch(exportSearch);
    }
    if (activeKey === "reports") {
      setAppliedReportSearch(reportSearch);
    }
    setAppliedStartDate(searchStartDate);
    setAppliedEndDate(searchEndDate);
  };
  const resetSearch = () => {
    setSearchStartDate("");
    setSearchEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setEmployeeSearch({ name: "", phone: "", department: "", position: "", role: "" });
    setAppliedEmployeeSearch({ name: "", phone: "", department: "", position: "", role: "" });
    setCustomerSearch({ name: "", contact: "", level: "", owner: "" });
    setAppliedCustomerSearch({ name: "", contact: "", level: "", owner: "" });
    setOrderSearch({ customer: "", status: "", route: "", payee: "", orderUuid: "" });
    setAppliedOrderSearch({ customer: "", status: "", route: "", payee: "", orderUuid: "" });
    setFollowUpSearch({ customer: "", channel: "", result: "", owner: "", orderUuid: "" });
    setAppliedFollowUpSearch({ customer: "", channel: "", result: "", owner: "", orderUuid: "" });
    setAuditSearch({ actor: "", department: "", action: "", targetType: "", targetUuid: "" });
    setAppliedAuditSearch({ actor: "", department: "", action: "", targetType: "", targetUuid: "" });
    setAlertSearch({ ruleCode: "", status: "", actor: "" });
    setAppliedAlertSearch({ ruleCode: "", status: "", actor: "" });
    setExportSearch({ scope: "", status: "", requester: "", reviewer: "" });
    setAppliedExportSearch({ scope: "", status: "", requester: "", reviewer: "" });
    setReportSearch({
      employeeName: "",
      employeeDepartment: "",
      employeePosition: "",
      customerName: "",
      customerLevel: ""
    });
    setAppliedReportSearch({
      employeeName: "",
      employeeDepartment: "",
      employeePosition: "",
      customerName: "",
      customerLevel: ""
    });
  };

  const employeeDepartmentOptions = useMemo(
    () => Array.from(new Set(employees.map((item) => item.department).filter(Boolean))).sort(),
    [employees]
  );
  const employeeRoleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map((item) => item.role?.name || item.role?.code || "")
            .filter((value) => value)
        )
      ).sort(),
    [employees]
  );
  const employeePositionOptions = useMemo(
    () => Array.from(new Set(employees.map((item) => item.position).filter(Boolean))).sort(),
    [employees]
  );
  const customerLevelOptions = useMemo(
    () => Array.from(new Set(customers.map((item) => item.level).filter(Boolean))).sort(),
    [customers]
  );
  const customerOwnerOptions = useMemo(
    () => Array.from(new Set(customers.map((item) => item.owner?.name || "").filter(Boolean))).sort(),
    [customers]
  );
  const ownerOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    employees.forEach((item) => {
      const label = item.department ? `${item.name}（${item.department}）` : item.name;
      map.set(item.employeeUuid, { value: item.employeeUuid, label: label || item.employeeUuid });
    });
    if (profile?.employeeUuid && !map.has(profile.employeeUuid)) {
      map.set(profile.employeeUuid, {
        value: profile.employeeUuid,
        label: profile.name || profile.employeeUuid
      });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [employees, profile]);
  const canChooseOwner = profile?.role?.code !== "staff";
  const orderStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...ORDER_STATUSES,
            ...orders.map((item) => item.status),
            ...orderApprovals.map((item) => item.status),
            ...refundApprovals.map((item) => item.status)
          ].filter(Boolean)
        )
      ).sort(),
    [orders, orderApprovals, refundApprovals]
  );
  const orderRouteOptions = useMemo(
    () => Array.from(new Set(orders.map((item) => item.route || "").filter(Boolean))).sort(),
    [orders]
  );
  const activeCompanyAccounts = useMemo(
    () => companyAccounts.filter((item) => item.status !== "停用").sort((a, b) => a.name.localeCompare(b.name)),
    [companyAccounts]
  );
  const followUpChannelOptions = useMemo(
    () => Array.from(new Set(followUps.map((item) => item.channel || "").filter(Boolean))).sort(),
    [followUps]
  );
  const auditDepartmentOptions = useMemo(
    () => Array.from(new Set(auditLogs.map((item) => item.actor?.department || "").filter(Boolean))).sort(),
    [auditLogs]
  );
  const auditTargetTypeOptions = useMemo(
    () => Array.from(new Set(auditLogs.map((item) => item.targetType || "").filter(Boolean))).sort(),
    [auditLogs]
  );
  const alertRuleOptions = useMemo(
    () => Array.from(new Set(alerts.map((item) => item.ruleCode).filter(Boolean))).sort(),
    [alerts]
  );
  const alertStatusOptions = useMemo(
    () => Array.from(new Set(alerts.map((item) => item.status).filter(Boolean))).sort(),
    [alerts]
  );
  const alertActorOptions = useMemo(
    () => Array.from(new Set(alerts.map((item) => item.actor?.name || "").filter(Boolean))).sort(),
    [alerts]
  );
  const exportStatusOptions = useMemo(
    () => Array.from(new Set(exportApprovals.map((item) => item.status).filter(Boolean))).sort(),
    [exportApprovals]
  );
  const exportScopeOptions = useMemo(
    () => Array.from(new Set(exportApprovals.map((item) => item.scope).filter(Boolean))).sort(),
    [exportApprovals]
  );

  const submitEmployee = async () => {
    const required = [
      employeeForm.name,
      employeeForm.phone,
      employeeForm.department,
      employeeForm.position,
      employeeForm.roleCode,
      employeeForm.status
    ];
    if (required.some((value) => !value.trim())) {
      setEmployeeFormError("请填写完整的必填字段");
      return;
    }
    setEmployeeFormLoading(true);
    setEmployeeFormError("");
    try {
      await request("/employees/create", {
        name: employeeForm.name.trim(),
        phone: employeeForm.phone.trim(),
        department: employeeForm.department.trim(),
        position: employeeForm.position.trim(),
        roleCode: employeeForm.roleCode.trim(),
        status: employeeForm.status.trim(),
        email: employeeForm.email.trim() || undefined,
        hiredAt: employeeForm.hiredAt || undefined,
        employeeNo: employeeForm.employeeNo.trim() || undefined
      });
      setEmployeeForm({
        name: "",
        phone: "",
        department: "",
        position: "",
        roleCode: "",
        status: "",
        email: "",
        hiredAt: "",
        employeeNo: ""
      });
      setShowEmployeeForm(false);
      loadEmployees();
    } catch (err) {
      setEmployeeFormError(err instanceof Error ? err.message : "新增员工失败");
    } finally {
      setEmployeeFormLoading(false);
    }
  };

  const submitCustomer = async () => {
    const required = [customerForm.name, customerForm.contact, customerForm.level];
    if (required.some((value) => !value.trim())) {
      setCustomerFormError("请填写完整的必填字段");
      return;
    }
    setCustomerFormLoading(true);
    setCustomerFormError("");
    try {
      await request("/customers/create", {
        name: customerForm.name.trim(),
        contact: customerForm.contact.trim(),
        level: customerForm.level.trim(),
        ownerUuid: customerForm.ownerUuid.trim() || undefined,
        idNumber: customerForm.idNumber.trim() || undefined,
        birthDate: customerForm.birthDate || undefined,
        preferences: customerForm.preferences.trim() || undefined,
        notes: customerForm.notes.trim() || undefined
      });
      setCustomerForm({
        name: "",
        contact: "",
        level: "",
        ownerUuid: profile?.employeeUuid || "",
        idNumber: "",
        birthDate: "",
        preferences: "",
        notes: ""
      });
      setShowCustomerForm(false);
      loadCustomers();
    } catch (err) {
      setCustomerFormError(err instanceof Error ? err.message : "新增客户失败");
    } finally {
      setCustomerFormLoading(false);
    }
  };

  const submitOrder = async () => {
    const required = [orderForm.customerUuid, orderForm.amount, orderForm.status, orderForm.orderedAt];
    if (required.some((value) => !value.trim())) {
      setOrderFormError("请填写完整的必填字段");
      return;
    }
    if (!orderForm.companyAccountUuid && !orderForm.payee.trim()) {
      setOrderFormError("请选择公司收款账户或填写线下收款方");
      return;
    }
    setOrderFormLoading(true);
    setOrderFormError("");
    try {
      await request("/orders/create", {
        customerUuid: orderForm.customerUuid,
        amount: orderForm.amount.trim(),
        payee: orderForm.payee.trim() || undefined,
        companyAccountUuid: orderForm.companyAccountUuid || undefined,
        status: orderForm.status.trim(),
        ownerUuid: orderForm.ownerUuid.trim() || undefined,
        orderedAt: orderForm.orderedAt,
        departureAt: orderForm.departureAt || undefined,
        route: orderForm.route.trim() || undefined,
        attachment: orderForm.attachment.trim() || undefined,
        notes: orderForm.notes.trim() || undefined
      });
      setOrderForm({
        customerUuid: "",
        amount: "",
        payee: "",
        companyAccountUuid: "",
        status: "",
        ownerUuid: profile?.employeeUuid || "",
        orderedAt: "",
        departureAt: "",
        route: "",
        attachment: "",
        notes: ""
      });
      setShowOrderForm(false);
      loadOrdersPanel();
    } catch (err) {
      setOrderFormError(err instanceof Error ? err.message : "新增订单失败");
    } finally {
      setOrderFormLoading(false);
    }
  };

  const toggleCustomerForm = () => {
    if (!showCustomerForm) {
      if (canChooseOwner && employees.length === 0) {
        loadEmployees();
      }
      setCustomerForm((prev) => ({
        ...prev,
        ownerUuid: prev.ownerUuid || profile?.employeeUuid || ""
      }));
    }
    setShowCustomerForm((prev) => !prev);
  };

  const toggleOrderForm = () => {
    if (!showOrderForm) {
      if (canChooseOwner && employees.length === 0) {
        loadEmployees();
      }
      setOrderForm((prev) => ({
        ...prev,
        ownerUuid: prev.ownerUuid || profile?.employeeUuid || ""
      }));
    }
    setShowOrderForm((prev) => !prev);
  };

  const submitCompanyAccount = async () => {
    const required = [companyAccountForm.name, companyAccountForm.status];
    if (required.some((value) => !value.trim())) {
      setCompanyAccountFormError("请填写完整的必填字段");
      return;
    }
    setCompanyAccountFormLoading(true);
    setCompanyAccountFormError("");
    try {
      await request("/company-accounts/create", {
        name: companyAccountForm.name.trim(),
        bankName: companyAccountForm.bankName.trim() || undefined,
        accountNo: companyAccountForm.accountNo.trim() || undefined,
        status: companyAccountForm.status.trim(),
        notes: companyAccountForm.notes.trim() || undefined
      });
      setCompanyAccountForm({
        name: "",
        bankName: "",
        accountNo: "",
        status: "启用",
        notes: ""
      });
      setShowCompanyAccountForm(false);
      loadOrdersPanel();
    } catch (err) {
      setCompanyAccountFormError(err instanceof Error ? err.message : "新增收款账户失败");
    } finally {
      setCompanyAccountFormLoading(false);
    }
  };

  const submitFollowUp = async () => {
    const required = [
      followUpForm.customerUuid,
      followUpForm.followAt,
      followUpForm.channel,
      followUpForm.request,
      followUpForm.result
    ];
    if (required.some((value) => !value.trim())) {
      setFollowUpFormError("请填写完整的必填字段");
      return;
    }
    setFollowUpFormLoading(true);
    setFollowUpFormError("");
    try {
      await request("/followups/create", {
        customerUuid: followUpForm.customerUuid,
        orderUuid: followUpForm.orderUuid || undefined,
        followAt: followUpForm.followAt,
        channel: followUpForm.channel.trim(),
        request: followUpForm.request.trim(),
        result: followUpForm.result.trim(),
        nextFollowAt: followUpForm.nextFollowAt || undefined,
        attachment: followUpForm.attachment.trim() || undefined
      });
      setFollowUpForm({
        customerUuid: "",
        orderUuid: "",
        followAt: "",
        channel: "",
        request: "",
        result: "",
        nextFollowAt: "",
        attachment: ""
      });
      setShowFollowUpForm(false);
      loadFollowUps();
    } catch (err) {
      setFollowUpFormError(err instanceof Error ? err.message : "新增回访失败");
    } finally {
      setFollowUpFormLoading(false);
    }
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (item) =>
          matchesText(item.name, appliedEmployeeSearch.name) &&
          matchesText(item.phone, appliedEmployeeSearch.phone) &&
          matchesExact(item.department, appliedEmployeeSearch.department) &&
          matchesExact(item.position, appliedEmployeeSearch.position) &&
          (matchesExact(item.role?.name, appliedEmployeeSearch.role) ||
            matchesExact(item.role?.code, appliedEmployeeSearch.role))
      ),
    [employees, appliedEmployeeSearch]
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (item) =>
          matchesText(item.name, appliedCustomerSearch.name) &&
          matchesText(item.contact, appliedCustomerSearch.contact) &&
          matchesExact(item.level, appliedCustomerSearch.level) &&
          matchesExact(item.owner?.name, appliedCustomerSearch.owner)
      ),
    [customers, appliedCustomerSearch]
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (item) =>
          matchesText(item.customer?.name, appliedOrderSearch.customer) &&
          matchesExact(item.status, appliedOrderSearch.status) &&
          matchesExact(item.route, appliedOrderSearch.route) &&
          (matchesText(item.payee, appliedOrderSearch.payee) ||
            matchesText(item.companyAccount?.name, appliedOrderSearch.payee)) &&
          matchesText(item.orderUuid, appliedOrderSearch.orderUuid) &&
          matchesDateRange([item.orderedAt, item.departureAt])
      ),
    [orders, appliedOrderSearch, appliedStartDate, appliedEndDate]
  );

  const filteredFollowUps = useMemo(
    () =>
      followUps.filter(
        (item) =>
          matchesText(item.customer?.name, appliedFollowUpSearch.customer) &&
          matchesExact(item.channel, appliedFollowUpSearch.channel) &&
          matchesText(item.result, appliedFollowUpSearch.result) &&
          matchesText(item.owner?.name, appliedFollowUpSearch.owner) &&
          matchesText(item.order?.orderUuid, appliedFollowUpSearch.orderUuid) &&
          matchesDateRange([item.followAt, item.nextFollowAt])
      ),
    [followUps, appliedFollowUpSearch, appliedStartDate, appliedEndDate]
  );

  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter(
        (item) =>
          matchesText(item.actor?.name, appliedAuditSearch.actor) &&
          matchesExact(item.actor?.department, appliedAuditSearch.department) &&
          matchesText(item.action, appliedAuditSearch.action) &&
          matchesExact(item.targetType, appliedAuditSearch.targetType) &&
          matchesText(item.targetUuid, appliedAuditSearch.targetUuid) &&
          matchesDateRange([item.createdAt])
      ),
    [auditLogs, appliedAuditSearch, appliedStartDate, appliedEndDate]
  );

  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (item) =>
          matchesExact(item.ruleCode, appliedAlertSearch.ruleCode) &&
          matchesExact(item.status, appliedAlertSearch.status) &&
          matchesText(item.actor?.name, appliedAlertSearch.actor) &&
          matchesDateRange([item.createdAt])
      ),
    [alerts, appliedAlertSearch, appliedStartDate, appliedEndDate]
  );

  const filteredExportApprovals = useMemo(
    () =>
      exportApprovals.filter(
        (item) =>
          matchesExact(item.scope, appliedExportSearch.scope) &&
          matchesExact(item.status, appliedExportSearch.status) &&
          matchesText(item.requester?.name, appliedExportSearch.requester) &&
          matchesText(item.reviewer?.name, appliedExportSearch.reviewer) &&
          matchesDateRange([item.requestedAt, item.reviewedAt])
      ),
    [exportApprovals, appliedExportSearch, appliedStartDate, appliedEndDate]
  );

  const filteredOrderApprovals = useMemo(
    () =>
      orderApprovals.filter(
        (item) =>
          matchesText(item.order?.customer?.name, appliedOrderSearch.customer) &&
          (matchesExact(item.status, appliedOrderSearch.status) ||
            matchesExact(item.order?.status, appliedOrderSearch.status)) &&
          matchesText(item.order?.orderUuid, appliedOrderSearch.orderUuid) &&
          matchesDateRange([item.requestedAt, item.reviewedAt])
      ),
    [orderApprovals, appliedOrderSearch, appliedStartDate, appliedEndDate]
  );

  const filteredRefundApprovals = useMemo(
    () =>
      refundApprovals.filter(
        (item) =>
          matchesText(item.order?.customer?.name, appliedOrderSearch.customer) &&
          (matchesExact(item.status, appliedOrderSearch.status) ||
            matchesExact(item.order?.status, appliedOrderSearch.status)) &&
          matchesText(item.order?.orderUuid, appliedOrderSearch.orderUuid) &&
          matchesDateRange([item.requestedAt, item.reviewedAt])
      ),
    [refundApprovals, appliedOrderSearch, appliedStartDate, appliedEndDate]
  );

  const filteredEmployeeReport = useMemo(
    () =>
      employeeReport.items.filter(
        (item) =>
          matchesText(item.name, appliedReportSearch.employeeName) &&
          matchesExact(item.department, appliedReportSearch.employeeDepartment) &&
          matchesExact(item.position, appliedReportSearch.employeePosition)
      ),
    [employeeReport.items, appliedReportSearch]
  );

  const filteredCustomerReport = useMemo(
    () =>
      customerReport.items.filter(
        (item) =>
          matchesText(item.name, appliedReportSearch.customerName) &&
          matchesExact(item.level, appliedReportSearch.customerLevel) &&
          matchesDateRange([item.lastOrderedAt, item.lastRegradeAt])
      ),
    [customerReport.items, appliedReportSearch, appliedStartDate, appliedEndDate]
  );

  const employeesEmptyLabel = emptyLabel(filteredEmployees.length, employees.length, "暂无员工数据");
  const customersEmptyLabel = emptyLabel(filteredCustomers.length, customers.length, "暂无客户数据");
  const ordersEmptyLabel = emptyLabel(filteredOrders.length, orders.length, "暂无订单数据");
  const orderApprovalsEmptyLabel = emptyLabel(
    filteredOrderApprovals.length,
    orderApprovals.length,
    "暂无订单审批"
  );
  const refundApprovalsEmptyLabel = emptyLabel(
    filteredRefundApprovals.length,
    refundApprovals.length,
    "暂无退款审批"
  );
  const followUpsEmptyLabel = emptyLabel(filteredFollowUps.length, followUps.length, "暂无回访数据");
  const auditEmptyLabel = emptyLabel(filteredAuditLogs.length, auditLogs.length, "暂无审计数据");
  const alertsEmptyLabel = emptyLabel(filteredAlerts.length, alerts.length, "暂无异常预警");
  const exportApprovalsEmptyLabel = emptyLabel(
    filteredExportApprovals.length,
    exportApprovals.length,
    "暂无导出审批"
  );
  const employeeReportEmptyLabel = emptyLabel(
    filteredEmployeeReport.length,
    employeeReport.items.length,
    "暂无员工绩效数据"
  );
  const customerReportEmptyLabel = emptyLabel(
    filteredCustomerReport.length,
    customerReport.items.length,
    "暂无客户价值数据"
  );

  const supportsSearch = [
    "employees",
    "customers",
    "orders",
    "followups",
    "audit",
    "alerts",
    "export-approvals",
    "reports"
  ].includes(activeKey);
  const needsDateRange = ["orders", "followups", "audit", "alerts", "export-approvals", "reports"].includes(activeKey);

  useEffect(() => {
    resetSearch();
  }, [activeKey]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (activeKey === "employees") {
      loadEmployees();
    }
    if (activeKey === "customers") {
      loadCustomers();
    }
    if (activeKey === "orders") {
      loadOrdersPanel();
      if (customers.length === 0) {
        loadCustomers();
      }
    }
    if (activeKey === "followups") {
      loadFollowUps();
      if (customers.length === 0) {
        loadCustomers();
      }
      if (orders.length === 0) {
        loadOrdersOnly();
      }
    }
    if (activeKey === "audit") {
      loadAuditLogs();
    }
    if (activeKey === "alerts") {
      loadAlerts();
    }
    if (activeKey === "export-approvals") {
      loadExportApprovals();
    }
    if (activeKey === "backup") {
      loadBackups();
    }
    if (activeKey === "reports") {
      loadReports();
    }
  }, [activeKey, token]);

  const activeMenu = menu.find((item) => item.key === activeKey);

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
          fontFamily: "system-ui",
          padding: 24
        }}
      >
        <div
          style={{
            width: 360,
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 16px 40px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>员工与客户管理系统</div>
          <div style={{ color: "#6b7280", marginBottom: 16 }}>请先登录以继续</div>
          <div style={{ display: "grid", gap: 12 }}>
            <input
              placeholder="用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  login();
                }
              }}
              style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 6 }}
            />
            <input
              placeholder="密码"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  login();
                }
              }}
              style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 6 }}
            />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "#374151" }}>
              <input
                type="checkbox"
                checked={rememberAccount}
                onChange={(event) => setRememberAccount(event.target.checked)}
              />
              记住账号
            </label>
            <button onClick={login} disabled={loginLoading} style={{ padding: "10px 16px" }}>
              {loginLoading ? "登录中" : "登录"}
            </button>
          </div>
          {loginError ? <div style={{ color: "#d14343", marginTop: 12 }}>{loginError}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", background: "#111827", color: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>员工与客户管理系统</div>
      </div>
      <div style={{ padding: 16, background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ color: "#111827" }}>已登录</div>
          <button onClick={loadMenu} disabled={loading} style={{ padding: "6px 12px" }}>
            {loading ? "加载中" : "刷新菜单"}
          </button>
          <button onClick={logout} style={{ padding: "6px 12px" }}>退出登录</button>
          {error ? <div style={{ color: "#d14343" }}>{error}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: 220, background: "#f9fafb", borderRight: "1px solid #e5e7eb", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>导航</div>
          {menu.length === 0 ? <div style={{ color: "#6b7280" }}>暂无菜单</div> : null}
          {menu.map((item) => {
            const active = item.key === activeKey;
            return (
              <div
                key={item.key}
                onClick={() => setActiveKey(item.key)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  marginBottom: 6,
                  background: active ? "#111827" : "transparent",
                  color: active ? "#fff" : "#111827"
                }}
              >
                {item.text}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{activeMenu?.text || "请选择菜单"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {activeKey === "employees" ? (
                <button onClick={loadEmployees} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "customers" ? (
                <button onClick={loadCustomers} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "orders" ? (
                <button onClick={loadOrdersPanel} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "followups" ? (
                <button onClick={loadFollowUps} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "audit" ? (
                <button onClick={loadAuditLogs} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "alerts" ? (
                <>
                  <button onClick={loadAlerts} disabled={contentLoading}>刷新</button>
                  <button onClick={scanAlerts} disabled={contentLoading}>扫描</button>
                </>
              ) : null}
              {activeKey === "export-approvals" ? (
                <button onClick={loadExportApprovals} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "backup" ? (
                <>
                  <button onClick={loadBackups} disabled={contentLoading}>刷新</button>
                  <button onClick={runBackup} disabled={contentLoading}>执行备份</button>
                </>
              ) : null}
              {activeKey === "reports" ? (
                <button onClick={loadReports} disabled={contentLoading}>刷新</button>
              ) : null}
              {activeKey === "employees" ? (
                <button onClick={() => setShowEmployeeForm((prev) => !prev)} disabled={contentLoading}>
                  {showEmployeeForm ? "收起新增" : "新增员工"}
                </button>
              ) : null}
              {activeKey === "customers" ? (
                <button onClick={toggleCustomerForm} disabled={contentLoading}>
                  {showCustomerForm ? "收起新增" : "新增客户"}
                </button>
              ) : null}
              {activeKey === "orders" ? (
                <button onClick={toggleOrderForm} disabled={contentLoading}>
                  {showOrderForm ? "收起新增" : "新增订单"}
                </button>
              ) : null}
              {activeKey === "orders" ? (
                <button onClick={() => setShowCompanyAccountForm((prev) => !prev)} disabled={contentLoading}>
                  {showCompanyAccountForm ? "收起收款账户" : "收款账户配置"}
                </button>
              ) : null}
              {activeKey === "followups" ? (
                <button onClick={() => setShowFollowUpForm((prev) => !prev)} disabled={contentLoading}>
                  {showFollowUpForm ? "收起新增" : "新增回访"}
                </button>
              ) : null}
              {supportsSearch ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                  {activeKey === "employees" ? (
                    <>
                      <input
                        value={employeeSearch.name}
                        onChange={(event) => setEmployeeSearch({ ...employeeSearch, name: event.target.value })}
                        placeholder="姓名"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <input
                        value={employeeSearch.phone}
                        onChange={(event) => setEmployeeSearch({ ...employeeSearch, phone: event.target.value })}
                        placeholder="手机号"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 140, background: "#fff" }}
                      />
                      <select
                        value={employeeSearch.department}
                        onChange={(event) => setEmployeeSearch({ ...employeeSearch, department: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">部门</option>
                        {employeeDepartmentOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={employeeSearch.position}
                        onChange={(event) => setEmployeeSearch({ ...employeeSearch, position: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">岗位</option>
                        {employeePositionOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={employeeSearch.role}
                        onChange={(event) => setEmployeeSearch({ ...employeeSearch, role: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">角色</option>
                        {employeeRoleOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  {activeKey === "customers" ? (
                    <>
                      <input
                        value={customerSearch.name}
                        onChange={(event) => setCustomerSearch({ ...customerSearch, name: event.target.value })}
                        placeholder="姓名"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <input
                        value={customerSearch.contact}
                        onChange={(event) => setCustomerSearch({ ...customerSearch, contact: event.target.value })}
                        placeholder="联系方式"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 140, background: "#fff" }}
                      />
                      <select
                        value={customerSearch.level}
                        onChange={(event) => setCustomerSearch({ ...customerSearch, level: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">等级</option>
                        {customerLevelOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={customerSearch.owner}
                        onChange={(event) => setCustomerSearch({ ...customerSearch, owner: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">负责人</option>
                        {customerOwnerOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  {activeKey === "orders" ? (
                    <>
                      <input
                        value={orderSearch.customer}
                        onChange={(event) => setOrderSearch({ ...orderSearch, customer: event.target.value })}
                        placeholder="客户"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <input
                        value={orderSearch.orderUuid}
                        onChange={(event) => setOrderSearch({ ...orderSearch, orderUuid: event.target.value })}
                        placeholder="订单号"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 140, background: "#fff" }}
                      />
                      <select
                        value={orderSearch.status}
                        onChange={(event) => setOrderSearch({ ...orderSearch, status: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">状态</option>
                        {orderStatusOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={orderSearch.route}
                        onChange={(event) => setOrderSearch({ ...orderSearch, route: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">线路</option>
                        {orderRouteOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={orderSearch.payee}
                        onChange={(event) => setOrderSearch({ ...orderSearch, payee: event.target.value })}
                        placeholder="收款账户/收款方"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                    </>
                  ) : null}
                  {activeKey === "followups" ? (
                    <>
                      <input
                        value={followUpSearch.customer}
                        onChange={(event) => setFollowUpSearch({ ...followUpSearch, customer: event.target.value })}
                        placeholder="客户"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <select
                        value={followUpSearch.channel}
                        onChange={(event) => setFollowUpSearch({ ...followUpSearch, channel: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">方式</option>
                        {followUpChannelOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={followUpSearch.result}
                        onChange={(event) => setFollowUpSearch({ ...followUpSearch, result: event.target.value })}
                        placeholder="结果"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <input
                        value={followUpSearch.owner}
                        onChange={(event) => setFollowUpSearch({ ...followUpSearch, owner: event.target.value })}
                        placeholder="负责人"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <input
                        value={followUpSearch.orderUuid}
                        onChange={(event) => setFollowUpSearch({ ...followUpSearch, orderUuid: event.target.value })}
                        placeholder="订单号"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 140, background: "#fff" }}
                      />
                    </>
                  ) : null}
                  {activeKey === "audit" ? (
                    <>
                      <input
                        value={auditSearch.actor}
                        onChange={(event) => setAuditSearch({ ...auditSearch, actor: event.target.value })}
                        placeholder="操作人"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <select
                        value={auditSearch.department}
                        onChange={(event) => setAuditSearch({ ...auditSearch, department: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">部门</option>
                        {auditDepartmentOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={auditSearch.action}
                        onChange={(event) => setAuditSearch({ ...auditSearch, action: event.target.value })}
                        placeholder="动作"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <select
                        value={auditSearch.targetType}
                        onChange={(event) => setAuditSearch({ ...auditSearch, targetType: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">对象</option>
                        {auditTargetTypeOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={auditSearch.targetUuid}
                        onChange={(event) => setAuditSearch({ ...auditSearch, targetUuid: event.target.value })}
                        placeholder="对象编号"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 140, background: "#fff" }}
                      />
                    </>
                  ) : null}
                  {activeKey === "alerts" ? (
                    <>
                      <select
                        value={alertSearch.ruleCode}
                        onChange={(event) => setAlertSearch({ ...alertSearch, ruleCode: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">规则</option>
                        {alertRuleOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={alertSearch.status}
                        onChange={(event) => setAlertSearch({ ...alertSearch, status: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">状态</option>
                        {alertStatusOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={alertSearch.actor}
                        onChange={(event) => setAlertSearch({ ...alertSearch, actor: event.target.value })}
                        placeholder="操作人"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                    </>
                  ) : null}
                  {activeKey === "export-approvals" ? (
                    <>
                      <select
                        value={exportSearch.scope}
                        onChange={(event) => setExportSearch({ ...exportSearch, scope: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">范围</option>
                        {exportScopeOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={exportSearch.status}
                        onChange={(event) => setExportSearch({ ...exportSearch, status: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">状态</option>
                        {exportStatusOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={exportSearch.requester}
                        onChange={(event) => setExportSearch({ ...exportSearch, requester: event.target.value })}
                        placeholder="申请人"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <input
                        value={exportSearch.reviewer}
                        onChange={(event) => setExportSearch({ ...exportSearch, reviewer: event.target.value })}
                        placeholder="审批人"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                    </>
                  ) : null}
                  {activeKey === "reports" ? (
                    <>
                      <input
                        value={reportSearch.employeeName}
                        onChange={(event) => setReportSearch({ ...reportSearch, employeeName: event.target.value })}
                        placeholder="员工"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <select
                        value={reportSearch.employeeDepartment}
                        onChange={(event) => setReportSearch({ ...reportSearch, employeeDepartment: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">部门</option>
                        {employeeDepartmentOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <select
                        value={reportSearch.employeePosition}
                        onChange={(event) => setReportSearch({ ...reportSearch, employeePosition: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">岗位</option>
                        {employeePositionOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={reportSearch.customerName}
                        onChange={(event) => setReportSearch({ ...reportSearch, customerName: event.target.value })}
                        placeholder="客户"
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", minWidth: 120, background: "#fff" }}
                      />
                      <select
                        value={reportSearch.customerLevel}
                        onChange={(event) => setReportSearch({ ...reportSearch, customerLevel: event.target.value })}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      >
                        <option value="">等级</option>
                        {customerLevelOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  {needsDateRange ? (
                    <>
                      <input
                        type="date"
                        value={searchStartDate}
                        onChange={(event) => setSearchStartDate(event.target.value)}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      />
                      <span style={{ color: "#6b7280" }}>至</span>
                      <input
                        type="date"
                        value={searchEndDate}
                        onChange={(event) => setSearchEndDate(event.target.value)}
                        style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff" }}
                      />
                    </>
                  ) : null}
                  <button onClick={applySearch} disabled={contentLoading} style={{ padding: "6px 14px", borderRadius: 999, background: "#3b82f6", color: "#fff", border: "1px solid #3b82f6" }}>
                    搜索
                  </button>
                  <button onClick={resetSearch} disabled={contentLoading} style={{ padding: "6px 14px", borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb" }}>
                    重置
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {contentError ? <div style={{ color: "#d14343", marginTop: 8 }}>{contentError}</div> : null}
          {activeKey === "dashboard" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              欢迎使用系统，请从左侧选择功能模块。
            </div>
          ) : null}
          {activeKey === "employees" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              {showEmployeeForm ? (
                <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <input
                      placeholder="姓名"
                      value={employeeForm.name}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="手机号"
                      value={employeeForm.phone}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="部门"
                      value={employeeForm.department}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })}
                      list="employee-department-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="岗位"
                      value={employeeForm.position}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, position: event.target.value })}
                      list="employee-position-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="角色"
                      value={employeeForm.roleCode}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, roleCode: event.target.value })}
                      list="employee-role-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="状态"
                      value={employeeForm.status}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="邮箱"
                      value={employeeForm.email}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      type="date"
                      value={employeeForm.hiredAt}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, hiredAt: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="工号"
                      value={employeeForm.employeeNo}
                      onChange={(event) => setEmployeeForm({ ...employeeForm, employeeNo: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={submitEmployee} disabled={employeeFormLoading}>
                      {employeeFormLoading ? "提交中" : "提交"}
                    </button>
                    <button onClick={() => setShowEmployeeForm(false)} disabled={employeeFormLoading}>
                      取消
                    </button>
                    {employeeFormError ? <div style={{ color: "#d14343" }}>{employeeFormError}</div> : null}
                  </div>
                  <datalist id="employee-department-options">
                    {employeeDepartmentOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  <datalist id="employee-position-options">
                    {employeePositionOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  <datalist id="employee-role-options">
                    {employeeRoleOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              ) : null}
              <div style={{ marginBottom: 12 }}>{countLabel(filteredEmployees.length, employees.length, "人")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>姓名</th>
                    <th style={{ padding: "8px 6px" }}>手机号</th>
                    <th style={{ padding: "8px 6px" }}>部门</th>
                    <th style={{ padding: "8px 6px" }}>岗位</th>
                    <th style={{ padding: "8px 6px" }}>角色</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((item) => (
                    <tr key={item.employeeUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{item.name}</td>
                      <td style={{ padding: "8px 6px" }}>{item.phone}</td>
                      <td style={{ padding: "8px 6px" }}>{item.department}</td>
                      <td style={{ padding: "8px 6px" }}>{item.position}</td>
                      <td style={{ padding: "8px 6px" }}>{item.role?.name || item.role?.code || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employeesEmptyLabel && !contentLoading ? <div>{employeesEmptyLabel}</div> : null}
            </div>
          ) : null}
          {activeKey === "customers" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              {showCustomerForm ? (
                <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <input
                      placeholder="姓名"
                      value={customerForm.name}
                      onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="联系方式"
                      value={customerForm.contact}
                      onChange={(event) => setCustomerForm({ ...customerForm, contact: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="等级"
                      value={customerForm.level}
                      onChange={(event) => setCustomerForm({ ...customerForm, level: event.target.value })}
                      list="customer-level-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <select
                      value={customerForm.ownerUuid}
                      onChange={(event) => setCustomerForm({ ...customerForm, ownerUuid: event.target.value })}
                      disabled={!canChooseOwner}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="">负责人</option>
                      {ownerOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="身份证号"
                      value={customerForm.idNumber}
                      onChange={(event) => setCustomerForm({ ...customerForm, idNumber: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      type="date"
                      value={customerForm.birthDate}
                      onChange={(event) => setCustomerForm({ ...customerForm, birthDate: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="偏好"
                      value={customerForm.preferences}
                      onChange={(event) => setCustomerForm({ ...customerForm, preferences: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="备注"
                      value={customerForm.notes}
                      onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={submitCustomer} disabled={customerFormLoading}>
                      {customerFormLoading ? "提交中" : "提交"}
                    </button>
                    <button onClick={() => setShowCustomerForm(false)} disabled={customerFormLoading}>
                      取消
                    </button>
                    {customerFormError ? <div style={{ color: "#d14343" }}>{customerFormError}</div> : null}
                  </div>
                  <datalist id="customer-level-options">
                    {customerLevelOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              ) : null}
              <div style={{ marginBottom: 12 }}>{countLabel(filteredCustomers.length, customers.length, "位")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>姓名</th>
                    <th style={{ padding: "8px 6px" }}>联系方式</th>
                    <th style={{ padding: "8px 6px" }}>等级</th>
                    <th style={{ padding: "8px 6px" }}>负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((item) => (
                    <tr key={item.customerUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{item.name}</td>
                      <td style={{ padding: "8px 6px" }}>{item.contact}</td>
                      <td style={{ padding: "8px 6px" }}>{item.level}</td>
                      <td style={{ padding: "8px 6px" }}>{item.owner?.name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customersEmptyLabel && !contentLoading ? <div>{customersEmptyLabel}</div> : null}
            </div>
          ) : null}
          {activeKey === "orders" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              {showOrderForm ? (
                <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                  <div style={{ marginBottom: 12, fontWeight: 600 }}>新增订单</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <select
                      value={orderForm.customerUuid}
                      onChange={(event) => setOrderForm({ ...orderForm, customerUuid: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="">选择客户</option>
                      {customers.map((item) => (
                        <option key={item.customerUuid} value={item.customerUuid}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="金额"
                      value={orderForm.amount}
                      onChange={(event) => setOrderForm({ ...orderForm, amount: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <select
                      value={orderForm.companyAccountUuid}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) {
                          setOrderForm({ ...orderForm, companyAccountUuid: "", payee: "" });
                          return;
                        }
                        const selected = activeCompanyAccounts.find((item) => item.accountUuid === value);
                        setOrderForm({ ...orderForm, companyAccountUuid: value, payee: selected?.name || "" });
                      }}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="">线下收款</option>
                      {activeCompanyAccounts.map((item) => (
                        <option key={item.accountUuid} value={item.accountUuid}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="线下收款方"
                      value={orderForm.payee}
                      onChange={(event) => setOrderForm({ ...orderForm, payee: event.target.value })}
                      disabled={Boolean(orderForm.companyAccountUuid)}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="状态"
                      value={orderForm.status}
                      onChange={(event) => setOrderForm({ ...orderForm, status: event.target.value })}
                      list="order-status-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <select
                      value={orderForm.ownerUuid}
                      onChange={(event) => setOrderForm({ ...orderForm, ownerUuid: event.target.value })}
                      disabled={!canChooseOwner}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="">负责人</option>
                      {ownerOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={orderForm.orderedAt}
                      onChange={(event) => setOrderForm({ ...orderForm, orderedAt: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      type="date"
                      value={orderForm.departureAt}
                      onChange={(event) => setOrderForm({ ...orderForm, departureAt: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="线路"
                      value={orderForm.route}
                      onChange={(event) => setOrderForm({ ...orderForm, route: event.target.value })}
                      list="order-route-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="附件"
                      value={orderForm.attachment}
                      onChange={(event) => setOrderForm({ ...orderForm, attachment: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="备注"
                      value={orderForm.notes}
                      onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={submitOrder} disabled={orderFormLoading}>
                      {orderFormLoading ? "提交中" : "提交"}
                    </button>
                    <button onClick={() => setShowOrderForm(false)} disabled={orderFormLoading}>
                      取消
                    </button>
                    {orderFormError ? <div style={{ color: "#d14343" }}>{orderFormError}</div> : null}
                  </div>
                  <datalist id="order-status-options">
                    {orderStatusOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  <datalist id="order-route-options">
                    {orderRouteOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              ) : null}
              {showCompanyAccountForm ? (
                <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                  <div style={{ marginBottom: 12, fontWeight: 600 }}>收款账户配置</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <input
                      placeholder="账户名称"
                      value={companyAccountForm.name}
                      onChange={(event) => setCompanyAccountForm({ ...companyAccountForm, name: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="开户行"
                      value={companyAccountForm.bankName}
                      onChange={(event) => setCompanyAccountForm({ ...companyAccountForm, bankName: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="账号"
                      value={companyAccountForm.accountNo}
                      onChange={(event) => setCompanyAccountForm({ ...companyAccountForm, accountNo: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <select
                      value={companyAccountForm.status}
                      onChange={(event) => setCompanyAccountForm({ ...companyAccountForm, status: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="启用">启用</option>
                      <option value="停用">停用</option>
                    </select>
                    <input
                      placeholder="备注"
                      value={companyAccountForm.notes}
                      onChange={(event) => setCompanyAccountForm({ ...companyAccountForm, notes: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={submitCompanyAccount} disabled={companyAccountFormLoading}>
                      {companyAccountFormLoading ? "提交中" : "提交"}
                    </button>
                    <button onClick={() => setShowCompanyAccountForm(false)} disabled={companyAccountFormLoading}>
                      取消
                    </button>
                    {companyAccountFormError ? <div style={{ color: "#d14343" }}>{companyAccountFormError}</div> : null}
                  </div>
                </div>
              ) : null}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12 }}>{countLabel(companyAccounts.length, companyAccounts.length, "个")}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>账户名称</th>
                      <th style={{ padding: "8px 6px" }}>开户行</th>
                      <th style={{ padding: "8px 6px" }}>账号</th>
                      <th style={{ padding: "8px 6px" }}>状态</th>
                      <th style={{ padding: "8px 6px" }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyAccounts.map((item) => (
                      <tr key={item.accountUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.name}</td>
                        <td style={{ padding: "8px 6px" }}>{item.bankName || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.accountNo || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.status || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {companyAccounts.length === 0 && !contentLoading ? <div>暂无收款账户</div> : null}
              </div>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12 }}>{countLabel(filteredOrders.length, orders.length, "笔")}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>客户</th>
                      <th style={{ padding: "8px 6px" }}>收款账户</th>
                      <th style={{ padding: "8px 6px" }}>金额</th>
                      <th style={{ padding: "8px 6px" }}>状态</th>
                      <th style={{ padding: "8px 6px" }}>负责人</th>
                      <th style={{ padding: "8px 6px" }}>下单时间</th>
                      <th style={{ padding: "8px 6px" }}>出团时间</th>
                      <th style={{ padding: "8px 6px" }}>线路</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((item) => (
                      <tr key={item.orderUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.customer?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.companyAccount?.name || item.payee || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.amount}</td>
                        <td style={{ padding: "8px 6px" }}>{item.status}</td>
                        <td style={{ padding: "8px 6px" }}>{item.owner?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.orderedAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.departureAt || undefined)}</td>
                        <td style={{ padding: "8px 6px" }}>{item.route || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ordersEmptyLabel && !contentLoading ? <div>{ordersEmptyLabel}</div> : null}
              </div>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12 }}>{countLabel(filteredOrderApprovals.length, orderApprovals.length, "条")}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>客户</th>
                      <th style={{ padding: "8px 6px" }}>金额</th>
                      <th style={{ padding: "8px 6px" }}>订单状态</th>
                      <th style={{ padding: "8px 6px" }}>审批状态</th>
                      <th style={{ padding: "8px 6px" }}>申请人</th>
                      <th style={{ padding: "8px 6px" }}>审批人</th>
                      <th style={{ padding: "8px 6px" }}>申请时间</th>
                      <th style={{ padding: "8px 6px" }}>审批时间</th>
                      <th style={{ padding: "8px 6px" }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrderApprovals.map((item) => (
                      <tr key={item.orderApprovalUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.order?.customer?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.order?.amount ?? "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.order?.status || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.status}</td>
                        <td style={{ padding: "8px 6px" }}>{item.requester?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.reviewer?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.requestedAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.reviewedAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{item.comment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orderApprovalsEmptyLabel && !contentLoading ? <div>{orderApprovalsEmptyLabel}</div> : null}
              </div>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12 }}>{countLabel(filteredRefundApprovals.length, refundApprovals.length, "条")}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>客户</th>
                      <th style={{ padding: "8px 6px" }}>金额</th>
                      <th style={{ padding: "8px 6px" }}>订单状态</th>
                      <th style={{ padding: "8px 6px" }}>审批状态</th>
                      <th style={{ padding: "8px 6px" }}>申请人</th>
                      <th style={{ padding: "8px 6px" }}>审批人</th>
                      <th style={{ padding: "8px 6px" }}>申请时间</th>
                      <th style={{ padding: "8px 6px" }}>审批时间</th>
                      <th style={{ padding: "8px 6px" }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefundApprovals.map((item) => (
                      <tr key={item.refundApprovalUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.order?.customer?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.order?.amount ?? "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.order?.status || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.status}</td>
                        <td style={{ padding: "8px 6px" }}>{item.requester?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.reviewer?.name || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.requestedAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.reviewedAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{item.comment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {refundApprovalsEmptyLabel && !contentLoading ? <div>{refundApprovalsEmptyLabel}</div> : null}
              </div>
            </div>
          ) : null}
          {activeKey === "followups" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              {showFollowUpForm ? (
                <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <select
                      value={followUpForm.customerUuid}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, customerUuid: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="">选择客户</option>
                      {customers.map((item) => (
                        <option key={item.customerUuid} value={item.customerUuid}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={followUpForm.orderUuid}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, orderUuid: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    >
                      <option value="">关联订单</option>
                      {orders.map((item) => (
                        <option key={item.orderUuid} value={item.orderUuid}>
                          {item.orderUuid}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={followUpForm.followAt}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, followAt: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="方式"
                      value={followUpForm.channel}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, channel: event.target.value })}
                      list="followup-channel-options"
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="客户诉求"
                      value={followUpForm.request}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, request: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="回访结果"
                      value={followUpForm.result}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, result: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      type="datetime-local"
                      value={followUpForm.nextFollowAt}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, nextFollowAt: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                    <input
                      placeholder="附件"
                      value={followUpForm.attachment}
                      onChange={(event) => setFollowUpForm({ ...followUpForm, attachment: event.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff" }}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={submitFollowUp} disabled={followUpFormLoading}>
                      {followUpFormLoading ? "提交中" : "提交"}
                    </button>
                    <button onClick={() => setShowFollowUpForm(false)} disabled={followUpFormLoading}>
                      取消
                    </button>
                    {followUpFormError ? <div style={{ color: "#d14343" }}>{followUpFormError}</div> : null}
                  </div>
                  <datalist id="followup-channel-options">
                    {followUpChannelOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              ) : null}
              <div style={{ marginBottom: 12 }}>{countLabel(filteredFollowUps.length, followUps.length, "条")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>客户</th>
                    <th style={{ padding: "8px 6px" }}>方式</th>
                    <th style={{ padding: "8px 6px" }}>回访时间</th>
                    <th style={{ padding: "8px 6px" }}>结果</th>
                    <th style={{ padding: "8px 6px" }}>下次回访</th>
                    <th style={{ padding: "8px 6px" }}>负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFollowUps.map((item) => (
                    <tr key={item.followUpUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{item.customer?.name || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{item.channel || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{formatDate(item.followAt)}</td>
                      <td style={{ padding: "8px 6px" }}>{item.result || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{formatDate(item.nextFollowAt || undefined)}</td>
                      <td style={{ padding: "8px 6px" }}>{item.owner?.name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {followUpsEmptyLabel && !contentLoading ? <div>{followUpsEmptyLabel}</div> : null}
            </div>
          ) : null}
          {activeKey === "audit" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>{countLabel(filteredAuditLogs.length, auditLogs.length, "条")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>操作人</th>
                    <th style={{ padding: "8px 6px" }}>部门</th>
                    <th style={{ padding: "8px 6px" }}>动作</th>
                    <th style={{ padding: "8px 6px" }}>对象</th>
                    <th style={{ padding: "8px 6px" }}>摘要</th>
                    <th style={{ padding: "8px 6px" }}>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((item) => (
                    <tr key={item.auditLogUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{item.actor?.name || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{item.actor?.department || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{item.action}</td>
                      <td style={{ padding: "8px 6px" }}>{item.targetType || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{item.summary || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditEmptyLabel && !contentLoading ? <div>{auditEmptyLabel}</div> : null}
            </div>
          ) : null}
          {activeKey === "alerts" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>{countLabel(filteredAlerts.length, alerts.length, "条")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>规则</th>
                    <th style={{ padding: "8px 6px" }}>摘要</th>
                    <th style={{ padding: "8px 6px" }}>状态</th>
                    <th style={{ padding: "8px 6px" }}>操作人</th>
                    <th style={{ padding: "8px 6px" }}>部门</th>
                    <th style={{ padding: "8px 6px" }}>时间</th>
                    <th style={{ padding: "8px 6px" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((item) => (
                    <tr key={item.alertUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{item.ruleCode}</td>
                      <td style={{ padding: "8px 6px" }}>{item.summary}</td>
                      <td style={{ padding: "8px 6px" }}>{item.status}</td>
                      <td style={{ padding: "8px 6px" }}>{item.actor?.name || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{item.actor?.department || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{formatDate(item.createdAt)}</td>
                      <td style={{ padding: "8px 6px" }}>
                        {item.status === "待处理" ? (
                          <button onClick={() => resolveAlert(item.alertUuid)} disabled={contentLoading}>
                            处理
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {alertsEmptyLabel && !contentLoading ? <div>{alertsEmptyLabel}</div> : null}
            </div>
          ) : null}
          {activeKey === "backup" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12, fontWeight: 600 }}>备份状态</div>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <div>最近备份：{formatDate(backupData?.status?.lastBackupAt)}</div>
                  <div>最近演练：{formatDate(backupData?.status?.lastDrillAt)}</div>
                  <div>保留天数：{backupData?.retentionDays ?? "-"}</div>
                  <div>备份间隔：{backupData?.intervalDays ?? "-"}</div>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={loadBackups} disabled={contentLoading}>刷新</button>
                  <button onClick={runBackup} disabled={contentLoading}>执行备份</button>
                </div>
              </div>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12 }}>{countLabel(backupData?.items?.length ?? 0, backupData?.items?.length ?? 0, "份")}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>备份编号</th>
                      <th style={{ padding: "8px 6px" }}>时间</th>
                      <th style={{ padding: "8px 6px" }}>备注</th>
                      <th style={{ padding: "8px 6px" }}>大小</th>
                      <th style={{ padding: "8px 6px" }}>数据量</th>
                      <th style={{ padding: "8px 6px" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(backupData?.items ?? []).map((item) => (
                      <tr key={item.backupId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.backupId}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.createdAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{item.note || "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{item.size ?? "-"}</td>
                        <td style={{ padding: "8px 6px" }}>{formatCounts(item.counts)}</td>
                        <td style={{ padding: "8px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => drillBackup(item.backupId)} disabled={contentLoading}>
                            演练
                          </button>
                          <button onClick={() => restoreBackup(item.backupId)} disabled={contentLoading}>
                            恢复
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(backupData?.items ?? []).length === 0 && !contentLoading ? <div>暂无备份</div> : null}
              </div>
            </div>
          ) : null}
          {activeKey === "export-approvals" ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>{countLabel(filteredExportApprovals.length, exportApprovals.length, "条")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>范围</th>
                    <th style={{ padding: "8px 6px" }}>状态</th>
                    <th style={{ padding: "8px 6px" }}>申请人</th>
                    <th style={{ padding: "8px 6px" }}>审批人</th>
                    <th style={{ padding: "8px 6px" }}>申请时间</th>
                    <th style={{ padding: "8px 6px" }}>审批时间</th>
                    <th style={{ padding: "8px 6px" }}>备注</th>
                    <th style={{ padding: "8px 6px" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExportApprovals.map((item) => (
                    <tr key={item.exportApprovalUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>{item.scope}</td>
                      <td style={{ padding: "8px 6px" }}>{item.status}</td>
                      <td style={{ padding: "8px 6px" }}>{item.requester?.name || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{item.reviewer?.name || "-"}</td>
                      <td style={{ padding: "8px 6px" }}>{formatDate(item.requestedAt)}</td>
                      <td style={{ padding: "8px 6px" }}>{formatDate(item.reviewedAt)}</td>
                      <td style={{ padding: "8px 6px" }}>{item.comment || "-"}</td>
                      <td style={{ padding: "8px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {item.status === "待审批" ? (
                          <>
                            <button
                              onClick={() => approveExportApproval(item.exportApprovalUuid)}
                              disabled={contentLoading}
                            >
                              通过
                            </button>
                            <button
                              onClick={() => rejectExportApproval(item.exportApprovalUuid)}
                              disabled={contentLoading}
                            >
                              驳回
                            </button>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {exportApprovalsEmptyLabel && !contentLoading ? <div>{exportApprovalsEmptyLabel}</div> : null}
            </div>
          ) : null}
          {activeKey === "reports" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12, fontWeight: 600 }}>员工绩效</div>
                <div style={{ marginBottom: 12 }}>
                  {countLabel(filteredEmployeeReport.length, employeeReport.total ?? employeeReport.items.length, "条")}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>姓名</th>
                      <th style={{ padding: "8px 6px" }}>部门</th>
                      <th style={{ padding: "8px 6px" }}>岗位</th>
                      <th style={{ padding: "8px 6px" }}>客户数</th>
                      <th style={{ padding: "8px 6px" }}>订单数</th>
                      <th style={{ padding: "8px 6px" }}>成交额</th>
                      <th style={{ padding: "8px 6px" }}>转化率</th>
                      <th style={{ padding: "8px 6px" }}>回访数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployeeReport.map((item) => (
                      <tr key={item.employeeUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.name}</td>
                        <td style={{ padding: "8px 6px" }}>{item.department}</td>
                        <td style={{ padding: "8px 6px" }}>{item.position}</td>
                        <td style={{ padding: "8px 6px" }}>{item.customerCount}</td>
                        <td style={{ padding: "8px 6px" }}>{item.orderCount}</td>
                        <td style={{ padding: "8px 6px" }}>{item.orderAmount}</td>
                        <td style={{ padding: "8px 6px" }}>{(item.conversionRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: "8px 6px" }}>{item.followUpCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employeeReportEmptyLabel && !contentLoading ? <div>{employeeReportEmptyLabel}</div> : null}
              </div>
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 12, fontWeight: 600 }}>客户价值</div>
                <div style={{ marginBottom: 12 }}>
                  {countLabel(filteredCustomerReport.length, customerReport.total ?? customerReport.items.length, "条")}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 6px" }}>姓名</th>
                      <th style={{ padding: "8px 6px" }}>等级</th>
                      <th style={{ padding: "8px 6px" }}>订单额</th>
                      <th style={{ padding: "8px 6px" }}>订单数</th>
                      <th style={{ padding: "8px 6px" }}>出团数</th>
                      <th style={{ padding: "8px 6px" }}>最近下单</th>
                      <th style={{ padding: "8px 6px" }}>升降级次数</th>
                      <th style={{ padding: "8px 6px" }}>最近升降级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomerReport.map((item) => (
                      <tr key={item.customerUuid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 6px" }}>{item.name}</td>
                        <td style={{ padding: "8px 6px" }}>{item.level}</td>
                        <td style={{ padding: "8px 6px" }}>{item.amountSum}</td>
                        <td style={{ padding: "8px 6px" }}>{item.ordersCount}</td>
                        <td style={{ padding: "8px 6px" }}>{item.tripsCount}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.lastOrderedAt)}</td>
                        <td style={{ padding: "8px 6px" }}>{item.regradeCount}</td>
                        <td style={{ padding: "8px 6px" }}>{formatDate(item.lastRegradeAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customerReportEmptyLabel && !contentLoading ? <div>{customerReportEmptyLabel}</div> : null}
              </div>
            </div>
          ) : null}
          {activeKey &&
            !["dashboard", "employees", "customers", "orders", "followups", "audit", "alerts", "backup", "export-approvals", "reports"].includes(activeKey) ? (
            <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 8 }}>
              页面建设中：{activeMenu?.text || activeKey}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
