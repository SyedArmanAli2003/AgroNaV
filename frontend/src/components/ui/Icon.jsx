/**
 * Icon.jsx — Centralized icon exports for AgroNav.
 * All icons from lucide-react, wrapped for consistent sizing.
 * Replace ALL emojis with these components.
 */
import {
  MapPin, Zap, WifiOff, RefreshCw, Package, Bell,
  CheckCircle, XCircle, PenLine, ClipboardList, User,
  Home, AlertTriangle, Leaf, Store, Megaphone, Users,
  ShieldCheck, BarChart3, TrendingUp, LogOut,
  ChevronLeft, ChevronRight, Eye, EyeOff, Handshake,
  Clock, UserPlus, Download, Plus, Search
} from 'lucide-react';

// --- Named icon wrappers with sensible defaults ---

export const IconMapPin = (props) => <MapPin size={18} {...props} />;
export const IconZap = (props) => <Zap size={18} {...props} />;
export const IconWifiOff = (props) => <WifiOff size={18} {...props} />;
export const IconRefresh = (props) => <RefreshCw size={18} {...props} />;
export const IconPackage = (props) => <Package size={16} color="var(--color-primary)" {...props} />;
export const IconBell = (props) => <Bell size={18} {...props} />;
export const IconCheck = (props) => <CheckCircle size={14} color="var(--color-primary)" {...props} />;
export const IconCheckCircle = (props) => <CheckCircle size={16} color="var(--color-success)" {...props} />;
export const IconXCircle = (props) => <XCircle size={16} color="var(--color-urgent)" {...props} />;
export const IconHandshake = (props) => <Handshake size={16} {...props} />;
export const IconPen = (props) => <PenLine size={18} {...props} />;
export const IconClipboard = (props) => <ClipboardList size={18} {...props} />;
export const IconUser = (props) => <User size={18} {...props} />;
export const IconHome = (props) => <Home size={18} {...props} />;
export const IconAlert = (props) => <AlertTriangle size={16} color="var(--color-warning)" {...props} />;
export const IconLeaf = (props) => <Leaf size={18} {...props} />;
export const IconStore = (props) => <Store size={16} {...props} />;
export const IconMegaphone = (props) => <Megaphone size={16} {...props} />;
export const IconUsers = (props) => <Users size={16} {...props} />;
export const IconShield = (props) => <ShieldCheck size={18} {...props} />;
export const IconBarChart = (props) => <BarChart3 size={18} {...props} />;
export const IconTrendingUp = (props) => <TrendingUp size={18} {...props} />;
export const IconLogOut = (props) => <LogOut size={18} {...props} />;
export const IconChevronLeft = (props) => <ChevronLeft size={20} {...props} />;
export const IconChevronRight = (props) => <ChevronRight size={16} {...props} />;
export const IconEye = (props) => <Eye size={18} {...props} />;
export const IconEyeOff = (props) => <EyeOff size={18} {...props} />;
export const IconClock = (props) => <Clock size={16} {...props} />;
export const IconUserPlus = (props) => <UserPlus size={18} {...props} />;
export const IconDownload = (props) => <Download size={18} {...props} />;
export const IconPlus = (props) => <Plus size={18} {...props} />;
export const IconSearch = (props) => <Search size={18} {...props} />;

export default {
  MapPin: IconMapPin,
  Zap: IconZap,
  WifiOff: IconWifiOff,
  Refresh: IconRefresh,
  Package: IconPackage,
  Bell: IconBell,
  Check: IconCheck,
  XCircle: IconXCircle,
  Pen: IconPen,
  Clipboard: IconClipboard,
  User: IconUser,
  Home: IconHome,
  Alert: IconAlert,
  Leaf: IconLeaf,
  Store: IconStore,
  Megaphone: IconMegaphone,
  Users: IconUsers,
  Shield: IconShield,
  BarChart: IconBarChart,
  TrendingUp: IconTrendingUp,
  LogOut: IconLogOut,
};
